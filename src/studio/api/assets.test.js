import { expect, test, vi } from 'vitest'
import { StorageApiError, StorageUnknownError } from '@supabase/storage-js'
import {
  readAssetRecoveryItems,
  reconcileAssetRecovery,
  recordAssetRecovery,
} from '../lib/assetRecovery'
import { uploadAsset } from './assets'

const projectId = '11111111-1111-4111-8111-111111111111'
const assetId = '22222222-2222-4222-8222-222222222222'
const uppercaseProjectId = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'
const uppercaseAssetId = 'BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB'
const assetFields = 'id, project_id, storage_path, original_name, mime_type, size_bytes, permission_status, created_by, created_at'

function createFile(name = 'garden.jpg', type = 'image/jpeg', size = 5) {
  const file = new File(['image'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function expectedAssetPayload(file = createFile()) {
  return {
    id: assetId,
    project_id: projectId,
    storage_path: `raw/${projectId}/${assetId}.jpg`,
    original_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    permission_status: 'unconfirmed',
  }
}

function createFailingRecoveryRecorder(error) {
  const storage = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: () => { throw error },
    removeItem: vi.fn(),
  }
  return (item) => recordAssetRecovery(item, storage)
}

function createClient({ uploadResult, insertResult, removeResult, reconcileResult } = {}) {
  const upload = vi.fn().mockResolvedValue(uploadResult ?? { data: { path: 'uploaded' }, error: null })
  const remove = vi.fn().mockResolvedValue(removeResult ?? { data: null, error: null })
  const getPublicUrl = vi.fn()
  const bucket = { upload, remove, getPublicUrl }
  const storage = { from: vi.fn(() => bucket) }
  const single = vi.fn().mockResolvedValue(insertResult ?? {
    data: { id: assetId },
    error: null,
    status: 201,
  })
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const maybeSingle = vi.fn().mockResolvedValue(reconcileResult ?? {
    data: null,
    error: null,
    status: 200,
  })
  const eq = vi.fn(() => ({ maybeSingle }))
  const reconcileSelect = vi.fn(() => ({ eq }))
  const client = {
    storage,
    from: vi.fn(() => ({ insert, select: reconcileSelect })),
  }

  return {
    client,
    upload,
    remove,
    getPublicUrl,
    storage,
    insert,
    select,
    single,
    reconcileSelect,
    eq,
    maybeSingle,
  }
}

function upload(client, file, id = projectId, options = {}) {
  return uploadAsset(client, id, file, {
    randomUUID: () => assetId,
    reportCleanupError: vi.fn(),
    recordRecovery: vi.fn().mockReturnValue(true),
    recoverPending: vi.fn().mockResolvedValue({ resolved: 0, remaining: 0 }),
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

test('throws a definitive Storage API error unchanged and does not insert or remove', async () => {
  const uploadError = new StorageApiError('access denied', 403, 'AccessDenied')
  const mock = createClient({ uploadResult: { data: null, error: uploadError } })

  await expect(upload(mock.client, createFile())).rejects.toBe(uploadError)
  expect(mock.client.from).not.toHaveBeenCalled()
  expect(mock.remove).not.toHaveBeenCalled()
})

test('reconciles an unknown Storage upload outcome by removing before rejection', async () => {
  const uploadError = new StorageUnknownError(
    'network response unavailable',
    new TypeError('fetch failed'),
  )
  const mock = createClient({ uploadResult: { data: null, error: uploadError } })

  await expect(upload(mock.client, createFile())).rejects.toBe(uploadError)
  expect(mock.remove).toHaveBeenCalledWith([`raw/${projectId}/${assetId}.jpg`])
  expect(mock.upload.mock.invocationCallOrder[0]).toBeLessThan(
    mock.remove.mock.invocationCallOrder[0],
  )
  expect(mock.client.from).not.toHaveBeenCalled()
})

test('records unresolved cleanup after an unknown Storage outcome', async () => {
  const uploadError = new StorageUnknownError(
    'network response unavailable',
    new TypeError('fetch failed'),
  )
  const cleanupError = new StorageUnknownError(
    'cleanup response unavailable',
    new TypeError('fetch failed'),
  )
  const recordRecovery = vi.fn().mockReturnValue(true)
  const mock = createClient({
    uploadResult: { data: null, error: uploadError },
    removeResult: { data: null, error: cleanupError },
  })

  await expect(upload(mock.client, createFile(), projectId, { recordRecovery }))
    .rejects.toBe(uploadError)
  expect(recordRecovery).toHaveBeenCalledWith({
    kind: 'cleanup',
    assetId,
    projectId,
    storagePath: `raw/${projectId}/${assetId}.jpg`,
  })
  expect(mock.client.from).not.toHaveBeenCalled()
})

test('runs pending recovery after validation and isolates recovery failure from upload', async () => {
  const recoverPending = vi.fn().mockRejectedValue(new Error('recovery unavailable'))
  const mock = createClient()

  await expect(upload(mock.client, createFile(), projectId, { recoverPending }))
    .resolves.toEqual({ id: assetId })
  expect(recoverPending).toHaveBeenCalledWith(mock.client)
  expect(recoverPending.mock.invocationCallOrder[0]).toBeLessThan(
    mock.upload.mock.invocationCallOrder[0],
  )
})

test('a never-settling recovery drain cannot delay UUID generation or upload', async () => {
  const recoverPending = vi.fn(() => new Promise(() => {}))
  const randomUUID = vi.fn(() => assetId)
  const mock = createClient()

  const result = uploadAsset(mock.client, projectId, createFile(), {
    randomUUID,
    recoverPending,
    recordRecovery: vi.fn().mockReturnValue(true),
  })

  await vi.waitFor(() => expect(mock.upload).toHaveBeenCalledOnce())
  expect(randomUUID).toHaveBeenCalledOnce()
  await expect(result).resolves.toEqual({ id: assetId })
})

test('a late recovery rejection is handled without delaying a valid upload', async () => {
  const recovery = deferred()
  const recoverPending = vi.fn(() => recovery.promise)
  const mock = createClient()

  const result = upload(mock.client, createFile(), projectId, { recoverPending })

  await vi.waitFor(() => expect(mock.upload).toHaveBeenCalledOnce())
  await expect(result).resolves.toEqual({ id: assetId })

  recovery.reject(new Error('background recovery failed'))
  await Promise.resolve()
  await Promise.resolve()
})

test('invalid input never starts opportunistic recovery', async () => {
  const recoverPending = vi.fn()
  const mock = createClient()

  await expect(upload(
    mock.client,
    createFile('clip.mp4', 'video/mp4'),
    projectId,
    { recoverPending },
  )).rejects.toThrow()
  expect(recoverPending).not.toHaveBeenCalled()
})

test('canonicalizes uppercase project and generated asset UUIDs for path and row payload', async () => {
  const mock = createClient()
  const lowercaseProjectId = uppercaseProjectId.toLowerCase()
  const lowercaseAssetId = uppercaseAssetId.toLowerCase()
  const expectedPath = `raw/${lowercaseProjectId}/${lowercaseAssetId}.jpg`

  await uploadAsset(mock.client, uppercaseProjectId, createFile(), {
    randomUUID: () => uppercaseAssetId,
    recoverPending: vi.fn(),
    recordRecovery: vi.fn().mockReturnValue(true),
  })

  expect(mock.upload).toHaveBeenCalledWith(
    expectedPath,
    expect.any(File),
    { contentType: 'image/jpeg', upsert: false },
  )
  expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({
    id: lowercaseAssetId,
    project_id: lowercaseProjectId,
    storage_path: expectedPath,
  }))
})

test('records and replays an uppercase-origin ambiguous upload with canonical identifiers', async () => {
  window.localStorage.clear()
  const lowercaseProjectId = uppercaseProjectId.toLowerCase()
  const lowercaseAssetId = uppercaseAssetId.toLowerCase()
  const expectedPath = `raw/${lowercaseProjectId}/${lowercaseAssetId}.jpg`
  const insertError = { message: 'TypeError: first fetch failed', code: '' }
  const retryError = { message: 'TypeError: retry fetch failed', code: '' }
  const uploadMock = createClient()
  uploadMock.single
    .mockReset()
    .mockResolvedValueOnce({ data: null, error: insertError, status: 0 })
    .mockResolvedValueOnce({ data: null, error: retryError, status: 0 })

  await expect(uploadAsset(uploadMock.client, uppercaseProjectId, createFile(), {
    randomUUID: () => uppercaseAssetId,
    recoverPending: vi.fn(),
  })).rejects.toBe(insertError)

  const [recoveryItem] = readAssetRecoveryItems()
  expect(recoveryItem).toEqual(expect.objectContaining({
    assetId: lowercaseAssetId,
    projectId: lowercaseProjectId,
    storagePath: expectedPath,
    asset: expect.objectContaining({
      id: lowercaseAssetId,
      project_id: lowercaseProjectId,
      storage_path: expectedPath,
    }),
  }))

  const replayMock = createClient({ insertResult: {
    data: recoveryItem.asset,
    error: null,
    status: 201,
  } })
  await expect(reconcileAssetRecovery(replayMock.client)).resolves.toEqual({
    resolved: 1,
    remaining: 0,
  })
  expect(replayMock.insert).toHaveBeenCalledWith(recoveryItem.asset)
  expect(replayMock.remove).not.toHaveBeenCalled()
})

test('rejects an invalid generated asset id before opening the Storage bucket', async () => {
  const mock = createClient()

  await expect(uploadAsset(mock.client, projectId, createFile(), {
    randomUUID: () => '../escape',
    recoverPending: vi.fn(),
  })).rejects.toThrow('Invalid asset id: expected UUID')
  expect(mock.storage.from).not.toHaveBeenCalled()
  expect(mock.client.from).not.toHaveBeenCalled()
})

test('removes the uploaded object before rethrowing the same insert error', async () => {
  const insertError = new Error('insert rejected')
  const mock = createClient({ insertResult: { data: null, error: insertError } })

  await expect(upload(mock.client, createFile())).rejects.toBe(insertError)
  expect(mock.remove).toHaveBeenCalledOnce()
  expect(mock.remove).toHaveBeenCalledWith([`raw/${projectId}/${assetId}.jpg`])
})

test('waits for the first insert outcome and retries the same payload without deleting', async () => {
  const firstAttempt = deferred()
  const insertError = { message: 'TypeError: fetch failed', code: '' }
  const committedRow = expectedAssetPayload()
  const mock = createClient()
  mock.single
    .mockReset()
    .mockReturnValueOnce(firstAttempt.promise)
    .mockResolvedValueOnce({ data: committedRow, error: null, status: 201 })

  const result = upload(mock.client, createFile())

  await vi.waitFor(() => expect(mock.single).toHaveBeenCalledOnce())
  expect(mock.remove).not.toHaveBeenCalled()

  firstAttempt.resolve({ data: null, error: insertError, status: 0, statusText: '' })

  await expect(result).resolves.toBe(committedRow)
  expect(mock.single).toHaveBeenCalledTimes(2)
  expect(mock.insert).toHaveBeenNthCalledWith(1, expectedAssetPayload())
  expect(mock.insert).toHaveBeenNthCalledWith(2, expectedAssetPayload())
  expect(mock.maybeSingle).not.toHaveBeenCalled()
  expect(mock.remove).not.toHaveBeenCalled()
})

test('resolves a retry conflict by fetching and verifying the committed row', async () => {
  const firstAttempt = deferred()
  const insertError = { message: 'TypeError: fetch failed', code: '', status: 0 }
  const conflictError = { message: 'duplicate key', code: '23505' }
  const committedRow = expectedAssetPayload()
  const mock = createClient({ reconcileResult: {
    data: committedRow,
    error: null,
    status: 200,
  } })
  mock.single
    .mockReset()
    .mockReturnValueOnce(firstAttempt.promise)
    .mockResolvedValueOnce({ data: null, error: conflictError, status: 409 })

  const result = upload(mock.client, createFile())
  await vi.waitFor(() => expect(mock.single).toHaveBeenCalledOnce())
  expect(mock.remove).not.toHaveBeenCalled()

  firstAttempt.resolve({ data: null, error: insertError })

  await expect(result).resolves.toBe(committedRow)
  expect(mock.single).toHaveBeenCalledTimes(2)
  expect(mock.reconcileSelect).toHaveBeenCalledWith(assetFields)
  expect(mock.eq).toHaveBeenCalledWith('id', assetId)
  expect(mock.maybeSingle).toHaveBeenCalledOnce()
  expect(mock.single.mock.invocationCallOrder[1]).toBeLessThan(
    mock.maybeSingle.mock.invocationCallOrder[0],
  )
  expect(mock.remove).not.toHaveBeenCalled()
})

test('retains ambiguous recovery when retry conflict resolves to a mismatched row', async () => {
  const insertError = { message: 'TypeError: fetch failed', code: '', status: 0 }
  const conflictError = { message: 'duplicate key', code: '23505' }
  const recordRecovery = vi.fn().mockReturnValue(true)
  const mock = createClient({ reconcileResult: {
    data: { ...expectedAssetPayload(), project_id: '33333333-3333-4333-8333-333333333333' },
    error: null,
    status: 200,
  } })
  mock.single
    .mockReset()
    .mockResolvedValueOnce({ data: null, error: insertError })
    .mockResolvedValueOnce({ data: null, error: conflictError, status: 409 })

  await expect(upload(mock.client, createFile(), projectId, { recordRecovery }))
    .rejects.toBe(insertError)
  expect(recordRecovery).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'reconcile_insert',
    assetId,
    projectId,
    storagePath: `raw/${projectId}/${assetId}.jpg`,
    asset: expectedAssetPayload(),
  }))
  expect(mock.remove).not.toHaveBeenCalled()
})

test('retains reconciliation when the idempotent retry remains ambiguous', async () => {
  const insertError = { message: 'TypeError: first fetch failed', code: '' }
  const retryError = { message: 'TypeError: retry fetch failed', code: '' }
  const recordRecovery = vi.fn().mockReturnValue(true)
  const mock = createClient()
  mock.single
    .mockReset()
    .mockResolvedValueOnce({ data: null, error: insertError, status: 0, statusText: '' })
    .mockResolvedValueOnce({ data: null, error: retryError, status: 0, statusText: '' })

  await expect(upload(mock.client, createFile(), projectId, { recordRecovery }))
    .rejects.toBe(insertError)
  expect(mock.single).toHaveBeenCalledTimes(2)
  expect(mock.maybeSingle).not.toHaveBeenCalled()
  expect(mock.remove).not.toHaveBeenCalled()
  expect(recordRecovery).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'reconcile_insert',
    asset: expectedAssetPayload(),
  }))
})

test('throws a typed persistence error when local storage is unavailable for DB recovery', async () => {
  const insertError = { message: 'TypeError: first fetch failed', code: '' }
  const retryError = { message: 'TypeError: retry fetch failed', code: '' }
  const mock = createClient()
  mock.single
    .mockReset()
    .mockResolvedValueOnce({ data: null, error: insertError, status: 0, statusText: '' })
    .mockResolvedValueOnce({ data: null, error: retryError, status: 0, statusText: '' })

  await expect(upload(mock.client, createFile(), projectId, {
    recordRecovery: createFailingRecoveryRecorder(new Error('storage blocked')),
  })).rejects.toMatchObject({
    name: 'AssetRecoveryPersistenceError',
    code: 'ASSET_RECOVERY_PERSISTENCE_FAILED',
    message: 'Unable to persist asset recovery state',
    cause: insertError,
  })
  expect(mock.remove).not.toHaveBeenCalled()
})

test('throws a typed persistence error when quota blocks unknown Storage cleanup recovery', async () => {
  const uploadError = new StorageUnknownError(
    'network response unavailable',
    new TypeError('fetch failed'),
  )
  const cleanupError = new StorageUnknownError(
    'cleanup response unavailable',
    new TypeError('fetch failed'),
  )
  const mock = createClient({
    uploadResult: { data: null, error: uploadError },
    removeResult: { data: null, error: cleanupError },
  })

  await expect(upload(mock.client, createFile(), projectId, {
    recordRecovery: createFailingRecoveryRecorder(
      new DOMException('quota exceeded', 'QuotaExceededError'),
    ),
  })).rejects.toMatchObject({
    name: 'AssetRecoveryPersistenceError',
    code: 'ASSET_RECOVERY_PERSISTENCE_FAILED',
    message: 'Unable to persist asset recovery state',
    cause: uploadError,
  })
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
