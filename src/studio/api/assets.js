import { z } from 'zod'
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

export async function uploadAsset(
  client,
  projectId,
  file,
  {
    randomUUID = () => crypto.randomUUID(),
    reportCleanupError = console.error,
  } = {},
) {
  const parsedFile = assetFileSchema.parse(file)
  const parsedProjectId = parseProjectId(projectId)
  const assetId = randomUUID()
  const extension = extensionByMimeType[parsedFile.type]
  const storagePath = `raw/${parsedProjectId}/${assetId}.${extension}`
  const bucket = client.storage.from('studio-assets')
  const { error: uploadError } = await bucket.upload(storagePath, parsedFile, {
    contentType: parsedFile.type,
    upsert: false,
  })

  if (uploadError) throw uploadError

  let data
  let insertError

  try {
    const result = await client
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

    data = result.data
    insertError = result.error
  } catch (error) {
    insertError = error
  }

  if (insertError) {
    try {
      const { error: cleanupError } = await bucket.remove([storagePath])
      if (cleanupError) {
        reportCleanupFailure(reportCleanupError, cleanupError, {
          insertError,
          storagePath,
        })
      }
    } catch (cleanupError) {
      reportCleanupFailure(reportCleanupError, cleanupError, {
        insertError,
        storagePath,
      })
    }

    throw insertError
  }

  return data
}
