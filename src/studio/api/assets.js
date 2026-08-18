import { z } from 'zod'
import {
  reconcileAssetRecovery,
  recordAssetRecovery,
} from '../lib/assetRecovery'
import { assetFileSchema } from '../schemas/asset'

const assetFields = 'id, project_id, storage_path, original_name, mime_type, size_bytes, permission_status, created_by, created_at'
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

  return projectId
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

function safelyRecordRecovery(recordRecovery, item) {
  try {
    recordRecovery(item)
  } catch {
    // The original operation error remains authoritative if storage is blocked.
  }
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
  safelyRecordRecovery(recordRecovery, {
    kind: 'cleanup',
    assetId: context.assetId,
    projectId: context.projectId,
    storagePath: context.storagePath,
  })
  return false
}

async function reconcileAmbiguousInsert(client, assetId) {
  try {
    const result = await client
      .from('studio_assets')
      .select(assetFields)
      .eq('id', assetId)
      .maybeSingle()

    if (result?.error) return { status: 'unknown' }
    return result?.data
      ? { status: 'committed', row: result.data }
      : { status: 'absent' }
  } catch {
    return { status: 'unknown' }
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
  const parsedProjectId = parseProjectId(projectId)

  try {
    await recoverPending(client)
  } catch {
    // Existing recovery work must not prevent a new validated upload.
  }

  const assetId = randomUUID()
  const extension = extensionByMimeType[parsedFile.type]
  const storagePath = `raw/${parsedProjectId}/${assetId}.${extension}`
  const bucket = client.storage.from('studio-assets')
  let uploadResult

  try {
    uploadResult = await bucket.upload(storagePath, parsedFile, {
      contentType: parsedFile.type,
      upsert: false,
    })
  } catch (uploadError) {
    if (isUnknownStorageError(uploadError)) {
      await removeUploadedObject(bucket, {
        assetId,
        projectId: parsedProjectId,
        storagePath,
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
        reportContext: { uploadError, storagePath },
      }, { recordRecovery, reportCleanupError })
    }
    throw uploadError
  }

  let insertResult

  try {
    insertResult = await client
      .from('studio_assets')
      .insert({
        id: assetId,
        project_id: parsedProjectId,
        storage_path: storagePath,
        original_name: parsedFile.name,
        mime_type: parsedFile.type,
        size_bytes: parsedFile.size,
        permission_status: 'unconfirmed',
      })
      .select(assetFields)
      .single()
  } catch (error) {
    insertResult = { data: null, error }
  }

  const insertError = insertResult?.error
  if (insertError) {
    if (isAmbiguousDatabaseResult(insertResult)) {
      const reconciliation = await reconcileAmbiguousInsert(client, assetId)
      if (reconciliation.status === 'committed') return reconciliation.row
      if (reconciliation.status === 'unknown') {
        safelyRecordRecovery(recordRecovery, {
          kind: 'reconcile_insert',
          assetId,
          projectId: parsedProjectId,
          storagePath,
        })
        throw insertError
      }
    }

    await removeUploadedObject(bucket, {
      assetId,
      projectId: parsedProjectId,
      storagePath,
      reportContext: { insertError, storagePath },
    }, { recordRecovery, reportCleanupError })
    throw insertError
  }

  return insertResult?.data
}
