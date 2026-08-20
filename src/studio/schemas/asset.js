import { z } from 'zod'

export const acceptedImageTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

const inferredMimeTypeByExtension = {
  heic: 'image/heic',
  heif: 'image/heif',
}

export function inferAcceptedImageMimeType(file) {
  if (acceptedImageTypes.includes(file.type)) return file.type
  if (file.type !== '') return null

  const extension = file.name.split('.').pop()?.toLowerCase()
  return inferredMimeTypeByExtension[extension] ?? null
}

export const assetFileSchema = z.instanceof(File)
  .refine(
    (file) => inferAcceptedImageMimeType(file) !== null,
    '只接受 JPG、PNG、WebP 或 HEIC 圖片',
  )
  .refine(
    (file) => file.size <= 25 * 1024 * 1024,
    '單張圖片不得超過 25MB',
  )

export const assetPermissionSchema = z.enum([
  'unconfirmed',
  'publishable',
  'needs_redaction',
  'forbidden',
])
