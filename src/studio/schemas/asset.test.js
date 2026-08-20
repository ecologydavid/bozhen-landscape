import { describe, expect, test } from 'vitest'
import {
  acceptedImageTypes,
  assetFileSchema,
  assetPermissionSchema,
} from './asset'

function createFile(name, type, size) {
  const file = new File(['image'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('assetFileSchema', () => {
  test.each([
    ['image/jpeg', 'photo.jpg'],
    ['image/png', 'photo.png'],
    ['image/webp', 'photo.webp'],
    ['image/heic', 'photo.heic'],
    ['image/heif', 'photo.heif'],
  ])('accepts %s images at the 25 MiB boundary', (type, name) => {
    const file = createFile(name, type, 25 * 1024 * 1024)

    expect(assetFileSchema.parse(file)).toBe(file)
  })

  test('accepts a HEIC file when the browser does not infer its MIME type', () => {
    const file = createFile('photo.heic', '', 1)

    expect(assetFileSchema.safeParse(file).success).toBe(true)
  })

  test('exports the exact accepted image MIME types', () => {
    expect(acceptedImageTypes).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ])
  })

  test.each([
    ['video/mp4', 'clip.mp4'],
    ['', 'unknown'],
    ['application/octet-stream', 'unknown.bin'],
  ])('rejects unsupported MIME type %j with the safe validation message', (type, name) => {
    const result = assetFileSchema.safeParse(createFile(name, type, 1))

    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('只接受 JPG、PNG、WebP 或 HEIC 圖片')
  })

  test('rejects an image larger than 25 MiB with the safe validation message', () => {
    const result = assetFileSchema.safeParse(
      createFile('large.jpg', 'image/jpeg', 25 * 1024 * 1024 + 1),
    )

    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('單張圖片不得超過 25MB')
  })
})

describe('assetPermissionSchema', () => {
  test.each(['unconfirmed', 'publishable', 'needs_redaction', 'forbidden'])(
    'accepts %s',
    (permission) => {
      expect(assetPermissionSchema.parse(permission)).toBe(permission)
    },
  )

  test.each(['approved', 'private', '', null, undefined])('rejects %j', (permission) => {
    expect(assetPermissionSchema.safeParse(permission).success).toBe(false)
  })
})
