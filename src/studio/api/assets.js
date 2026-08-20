import { z } from 'zod'
import {
  assetRowsMatch,
  reconcileAssetRecovery,
  recordAssetRecovery,
  triggerAssetRecovery,
} from '../lib/assetRecovery'
import {
  assetFileSchema,
  assetPermissionSchema,
  inferAcceptedImageMimeType,
} from '../schemas/asset'

const assetFields = 'id, project_id, storage_path, original_name, mime_type, size_bytes, width, height, permission_status, privacy_flags, processing_status, created_at, updated_at'
const allowedStorageExtensions = new Set(['jpg', 'png', 'webp', 'heic', 'heif'])
const assetPageSchema = z.object({
  limit: z.number().int().min(1).max(100).default(24),
  offset: z.number().int().min(0).default(0),
})
const permissionUpdateOptionsSchema = z.object({
  expectedUpdatedAt: z.string().min(1),
  expectedPermissionStatus: assetPermissionSchema,
})
const extensionByMimeType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

function parseProjectId(projectId) {
  if (!z.uuid().safeParse(projectId).success) {
    throw new TypeError('Invalid project id: expected UUID')
  }

  return projectId.toLowerCase()
}

function parseAssetId(assetId) {
  if (!z.uuid().safeParse(assetId).success) {
    throw new TypeError('Invalid asset id: expected UUID')
  }

  return assetId.toLowerCase()
}

function parseStoragePath(storagePath) {
  if (typeof storagePath !== 'string') {
    throw new TypeError('Invalid asset storage path')
  }

  const match = /^raw\/([0-9a-f-]+)\/([0-9a-f-]+)\.([a-z0-9]+)$/.exec(storagePath)
  if (!match || !allowedStorageExtensions.has(match[3])) {
    throw new TypeError('Invalid asset storage path')
  }

  try {
    const projectId = parseProjectId(match[1])
    const assetId = parseAssetId(match[2])
    const canonicalPath = `raw/${projectId}/${assetId}.${match[3]}`
    if (storagePath !== canonicalPath) throw new TypeError('Invalid asset storage path')
    return canonicalPath
  } catch {
    throw new TypeError('Invalid asset storage path')
  }
}

export class AssetPermissionConflictError extends Error {
  constructor() {
    super('Asset permission was updated concurrently')
    this.name = 'AssetPermissionConflictError'
    this.code = 'ASSET_PERMISSION_CONFLICT'
  }
}

export async function listAssets(client, projectId, options = {}) {
  const parsedProjectId = parseProjectId(projectId)
  const { limit, offset } = assetPageSchema.parse(options)
  // Task 2 schema work must back this pagination with
  // (project_id, created_at DESC, id DESC); the migration remains Docker-blocked.
  const { data, error } = await client
    .from('studio_assets')
    .select(assetFields)
    .eq('project_id', parsedProjectId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data ?? []
}

export async function getAsset(client, assetId) {
  const parsedAssetId = parseAssetId(assetId)
  const { data, error } = await client
    .from('studio_assets')
    .select(assetFields)
    .eq('id', parsedAssetId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createAssetPreviewUrl(client, storagePath) {
  const parsedStoragePath = parseStoragePath(storagePath)
  const { data, error } = await client.storage
    .from('studio-assets')
    .createSignedUrl(parsedStoragePath, 900)

  if (error) throw error
  return data.signedUrl
}

export async function updateAssetPermission(
  client,
  assetId,
  permissionStatus,
  options,
) {
  const parsedAssetId = parseAssetId(assetId)
  const status = assetPermissionSchema.parse(permissionStatus)
  const {
    expectedUpdatedAt,
    expectedPermissionStatus,
  } = permissionUpdateOptionsSchema.parse(options)
  const { data, error } = await client
    .from('studio_assets')
    .update({ permission_status: status })
    .eq('id', parsedAssetId)
    .eq('updated_at', expectedUpdatedAt)
    .eq('permission_status', expectedPermissionStatus)
    .select('id, permission_status, updated_at')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new AssetPermissionConflictError()
  return data
}

function reportCleanupFailure(reportCleanupError, cleanupError, context) {
  try {
    reportCleanupError('Studio asset cleanup failed', cleanupError, context)
  } catch {
    // Reporting must never replace the original database error.
  }
}

function isUnknownStorageError(error) {
  return typeof error === 'object'
    && error !== null
    && error.name === 'StorageUnknownError'
    && 'originalError' in error
    && error.status === undefined
    && error.statusCode === undefined
}

function isAmbiguousDatabaseResult(result) {
  return result?.status === 0
    || result?.statusCode === 0
    || result?.statusCode === '0'
    || result?.error?.status === 0
    || result?.error?.statusCode === 0
    || result?.error?.statusCode === '0'
}

export class AssetRecoveryPersistenceError extends Error {
  constructor(cause) {
    super('Unable to persist asset recovery state', { cause })
    this.name = 'AssetRecoveryPersistenceError'
    this.code = 'ASSET_RECOVERY_PERSISTENCE_FAILED'
  }
}

function persistRecovery(recordRecovery, item, originalError) {
  let acknowledged = false
  try {
    acknowledged = recordRecovery(item) === true
  } catch {
    // A typed error below keeps the user-facing boundary stable.
  }

  if (!acknowledged) throw new AssetRecoveryPersistenceError(originalError)
}

async function removeUploadedObject(
  bucket,
  context,
  { recordRecovery, reportCleanupError },
) {
  let cleanupError

  try {
    const result = await bucket.remove([context.storagePath])
    cleanupError = result?.error
  } catch (error) {
    cleanupError = error
  }

  if (!cleanupError) return true

  reportCleanupFailure(reportCleanupError, cleanupError, context.reportContext)
  persistRecovery(recordRecovery, {
    kind: 'cleanup',
    assetId: context.assetId,
    projectId: context.projectId,
    storagePath: context.storagePath,
  }, context.originalError)
  return false
}

async function fetchMatchingAsset(client, asset) {
  try {
    const result = await client
      .from('studio_assets')
      .select(assetFields)
      .eq('id', asset.id)
      .maybeSingle()

    if (result?.error || !assetRowsMatch(result?.data, asset)) return null
    return result.data
  } catch {
    return null
  }
}

async function insertAssetRow(client, asset) {
  try {
    return await client
      .from('studio_assets')
      .insert(asset)
      .select(assetFields)
      .single()
  } catch (error) {
    return { data: null, error }
  }
}

export async function uploadAsset(
  client,
  projectId,
  file,
  {
    randomUUID = () => crypto.randomUUID(),
    reportCleanupError = console.error,
    recordRecovery = recordAssetRecovery,
    recoverPending = reconcileAssetRecovery,
  } = {},
) {
  const parsedFile = assetFileSchema.parse(file)
  const mimeType = inferAcceptedImageMimeType(parsedFile)
  const parsedProjectId = parseProjectId(projectId)

  triggerAssetRecovery(client, recoverPending)

  const assetId = parseAssetId(randomUUID())
  const extension = extensionByMimeType[mimeType]
  const storagePath = `raw/${parsedProjectId}/${assetId}.${extension}`
  const bucket = client.storage.from('studio-assets')
  const uploadFile = parsedFile.type === mimeType
    ? parsedFile
    : new File([parsedFile], parsedFile.name, {
      type: mimeType,
      lastModified: parsedFile.lastModified,
    })
  let uploadResult

  try {
    uploadResult = await bucket.upload(storagePath, uploadFile, {
      contentType: mimeType,
      upsert: false,
    })
  } catch (uploadError) {
    if (isUnknownStorageError(uploadError)) {
      await removeUploadedObject(bucket, {
        assetId,
        projectId: parsedProjectId,
        storagePath,
        originalError: uploadError,
        reportContext: { uploadError, storagePath },
      }, { recordRecovery, reportCleanupError })
    }
    throw uploadError
  }

  const uploadError = uploadResult?.error

  if (uploadError) {
    if (isUnknownStorageError(uploadError)) {
      await removeUploadedObject(bucket, {
        assetId,
        projectId: parsedProjectId,
        storagePath,
        originalError: uploadError,
        reportContext: { uploadError, storagePath },
      }, { recordRecovery, reportCleanupError })
    }
    throw uploadError
  }

  const asset = {
    id: assetId,
    project_id: parsedProjectId,
    storage_path: storagePath,
    original_name: parsedFile.name,
    mime_type: mimeType,
    size_bytes: parsedFile.size,
    permission_status: 'unconfirmed',
  }
  const insertResult = await insertAssetRow(client, asset)

  const insertError = insertResult?.error
  if (insertError) {
    if (isAmbiguousDatabaseResult(insertResult)) {
      const retryResult = await insertAssetRow(client, asset)
      if (!retryResult?.error) return retryResult?.data

      if (retryResult.error.code === '23505') {
        const committedRow = await fetchMatchingAsset(client, asset)
        if (committedRow) return committedRow
      }

      persistRecovery(recordRecovery, {
        kind: 'reconcile_insert',
        assetId,
        projectId: parsedProjectId,
        storagePath,
        asset,
      }, insertError)
      throw insertError
    }

    await removeUploadedObject(bucket, {
      assetId,
      projectId: parsedProjectId,
      storagePath,
      originalError: insertError,
      reportContext: { insertError, storagePath },
    }, { recordRecovery, reportCleanupError })
    throw insertError
  }

  return insertResult?.data
}
