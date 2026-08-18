import { expect, test, vi } from 'vitest'
import { uploadAsset } from './assets'

const projectId = '11111111-1111-4111-8111-111111111111'
const assetId = '22222222-2222-4222-8222-222222222222'
const assetFields = 'id, project_id, storage_path, original_name, mime_type, size_bytes, permission_status, created_by, created_at'

function createFile(name = 'garden.jpg', type = 'image/jpeg', size = 5) {
  const file = new File(['image'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function createClient({ uploadResult, insertResult, removeResult } = {}) {
  const upload = vi.fn().mockResolvedValue(uploadResult ?? { data: { path: 'uploaded' }, error: null })
  const remove = vi.fn().mockResolvedValue(removeResult ?? { data: null, error: null })
  const getPublicUrl = vi.fn()
  const bucket = { upload, remove, getPublicUrl }
  const storage = { from: vi.fn(() => bucket) }
  const single = vi.fn().mockResolvedValue(insertResult ?? { data: { id: assetId }, error: null })
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const client = { storage, from: vi.fn(() => ({ insert })) }

  return { client, upload, remove, getPublicUrl, storage, insert, select, single }
}

function upload(client, file, id = projectId, options = {}) {
  return uploadAsset(client, id, file, {
    randomUUID: () => assetId,
    reportCleanupError: vi.fn(),
    ...options,
  })
}

test('uploads to the private bucket and inserts an explicit unconfirmed asset row', async () => {
  const file = createFile('Garden Final.JPG', 'image/jpeg', 5)
  const row = {
    id: assetId,
    project_id: projectId,
    storage_path: `raw/${projectId}/${assetId}.jpg`,
    original_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    permission_status: 'unconfirmed',
  }
  const mock = createClient({ insertResult: { data: row, error: null } })

  await expect(upload(mock.client, file)).resolves.toBe(row)
  expect(mock.storage.from).toHaveBeenCalledOnce()
  expect(mock.storage.from).toHaveBeenCalledWith('studio-assets')
  expect(mock.upload).toHaveBeenCalledWith(
    `raw/${projectId}/${assetId}.jpg`,
    file,
    { contentType: 'image/jpeg', upsert: false },
  )
  expect(mock.client.from).toHaveBeenCalledWith('studio_assets')
  expect(mock.insert).toHaveBeenCalledWith({
    id: assetId,
    project_id: projectId,
    storage_path: `raw/${projectId}/${assetId}.jpg`,
    original_name: 'Garden Final.JPG',
    mime_type: 'image/jpeg',
    size_bytes: 5,
    permission_status: 'unconfirmed',
  })
  expect(mock.select).toHaveBeenCalledWith(assetFields)
  expect(mock.select).not.toHaveBeenCalledWith('*')
  expect(mock.single).toHaveBeenCalledOnce()
  expect(mock.remove).not.toHaveBeenCalled()
  expect(mock.getPublicUrl).not.toHaveBeenCalled()
})

test.each([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/heic', 'heic'],
  ['image/heif', 'heif'],
])('maps %s to a trusted .%s extension', async (type, extension) => {
  const mock = createClient()
  const file = createFile('misleading.exe', type)

  await upload(mock.client, file)

  expect(mock.upload).toHaveBeenCalledWith(
    `raw/${projectId}/${assetId}.${extension}`,
    file,
    { contentType: type, upsert: false },
  )
})

test.each([
  ['unsupported file', projectId, createFile('clip.mp4', 'video/mp4')],
  ['oversized file', projectId, createFile('large.png', 'image/png', 25 * 1024 * 1024 + 1)],
  ['invalid project id', '../another-project', createFile()],
])('rejects %s before any network call', async (_name, id, file) => {
  const mock = createClient()

  await expect(upload(mock.client, file, id)).rejects.toThrow()
  expect(mock.storage.from).not.toHaveBeenCalled()
  expect(mock.client.from).not.toHaveBeenCalled()
})

test('rejects a path-traversal project id with a clear internal error', async () => {
  const mock = createClient()

  await expect(upload(mock.client, createFile(), '../../etc'))
    .rejects.toThrow('Invalid project id: expected UUID')
})

test('throws an upload error unchanged and does not insert or remove', async () => {
  const uploadError = new Error('private storage unavailable')
  const mock = createClient({ uploadResult: { data: null, error: uploadError } })

  await expect(upload(mock.client, createFile())).rejects.toBe(uploadError)
  expect(mock.client.from).not.toHaveBeenCalled()
  expect(mock.remove).not.toHaveBeenCalled()
})

test('removes the uploaded object before rethrowing the same insert error', async () => {
  const insertError = new Error('insert rejected')
  const mock = createClient({ insertResult: { data: null, error: insertError } })

  await expect(upload(mock.client, createFile())).rejects.toBe(insertError)
  expect(mock.remove).toHaveBeenCalledOnce()
  expect(mock.remove).toHaveBeenCalledWith([`raw/${projectId}/${assetId}.jpg`])
})

test('cleans up and preserves a rejected insert request error', async () => {
  const insertError = new Error('insert request rejected')
  const mock = createClient()
  mock.single.mockRejectedValue(insertError)

  await expect(upload(mock.client, createFile())).rejects.toBe(insertError)
  expect(mock.remove).toHaveBeenCalledOnce()
  expect(mock.remove).toHaveBeenCalledWith([`raw/${projectId}/${assetId}.jpg`])
})

test('cleanup failure never replaces the original insert error', async () => {
  const insertError = new Error('insert rejected')
  const cleanupError = new Error('cleanup rejected')
  const mock = createClient({
    insertResult: { data: null, error: insertError },
    removeResult: { data: null, error: cleanupError },
  })

  const reportCleanupError = vi.fn()

  await expect(upload(mock.client, createFile(), projectId, { reportCleanupError }))
    .rejects.toBe(insertError)
  expect(mock.remove).toHaveBeenCalledOnce()
  expect(reportCleanupError).toHaveBeenCalledWith(
    'Studio asset cleanup failed',
    cleanupError,
    { insertError, storagePath: `raw/${projectId}/${assetId}.jpg` },
  )
})

test('a rejected cleanup and failed reporter still preserve the insert error', async () => {
  const insertError = new Error('insert rejected')
  const cleanupError = new Error('cleanup request rejected')
  const mock = createClient({ insertResult: { data: null, error: insertError } })
  mock.remove.mockRejectedValue(cleanupError)

  await expect(upload(mock.client, createFile(), projectId, {
    reportCleanupError: () => {
      throw new Error('reporter failed')
    },
  })).rejects.toBe(insertError)
  expect(mock.remove).toHaveBeenCalledWith([`raw/${projectId}/${assetId}.jpg`])
})

test('successful inserts never remove the uploaded object', async () => {
  const mock = createClient()

  await upload(mock.client, createFile())

  expect(mock.remove).not.toHaveBeenCalled()
})
