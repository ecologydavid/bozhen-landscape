import { z } from 'zod'

export const acceptedImageTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

export const assetFileSchema = z.instanceof(File)
  .refine(
    (file) => acceptedImageTypes.includes(file.type),
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
