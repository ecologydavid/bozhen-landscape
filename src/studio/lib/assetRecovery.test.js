import { beforeEach, expect, test, vi } from 'vitest'
import {
  assetRecoveryStorageKey,
  readAssetRecoveryItems,
  reconcileAssetRecovery,
  recordAssetRecovery,
} from './assetRecovery'

const projectId = '11111111-1111-4111-8111-111111111111'
const assetId = '22222222-2222-4222-8222-222222222222'
const secondAssetId = '33333333-3333-4333-8333-333333333333'
const storagePath = `raw/${projectId}/${assetId}.jpg`
const secondStoragePath = `raw/${projectId}/${secondAssetId}.png`
const assetFields = 'id, project_id, storage_path, original_name, mime_type, size_bytes, permission_status, created_by, created_at'

function assetPayload(overrides = {}) {
  return {
    id: assetId,
    project_id: projectId,
    storage_path: storagePath,
    original_name: 'garden.jpg',
    mime_type: 'image/jpeg',
    size_bytes: 5,
    permission_status: 'unconfirmed',
    ...overrides,
  }
}

function recoveryItem(kind = 'cleanup', overrides = {}) {
  const item = { kind, assetId, projectId, storagePath, ...overrides }
  if (kind === 'reconcile_insert') item.asset = assetPayload(overrides.asset)
  return item
}

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function createClient({ insertResult, reconcileResult, removeResult } = {}) {
  const single = vi.fn().mockResolvedValue(insertResult ?? {
    data: assetPayload(),
    error: null,
    status: 201,
  })
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const maybeSingle = vi.fn().mockResolvedValue(reconcileResult ?? {
    data: assetPayload(),
    error: null,
    status: 200,
  })
  const eq = vi.fn(() => ({ maybeSingle }))
  const reconcileSelect = vi.fn(() => ({ eq }))
  const remove = vi.fn().mockResolvedValue(removeResult ?? { data: null, error: null })
  const client = {
    from: vi.fn(() => ({ insert, select: reconcileSelect })),
    storage: { from: vi.fn(() => ({ remove })) },
  }
  return { client, insert, select, single, reconcileSelect, eq, maybeSingle, remove }
}

beforeEach(() => {
  window.localStorage.clear()
})

test('stores one validated record per deterministic project and asset key', () => {
  const now = () => '2026-08-18T10:00:00.000Z'
  const item = recoveryItem('reconcile_insert')

  expect(recordAssetRecovery({
    ...item,
    secret: 'must-not-persist',
    rawError: { message: 'must-not-persist' },
  }, window.localStorage, now)).toBe(true)
  expect(recordAssetRecovery(item, window.localStorage, now)).toBe(true)

  expect(window.localStorage).toHaveLength(1)
  const key = `${assetRecoveryStorageKey}${projectId}:${assetId}`
  expect(JSON.parse(window.localStorage.getItem(key))).toEqual({
    kind: 'reconcile_insert',
    assetId,
    projectId,
    storagePath,
    asset: assetPayload(),
    createdAt: '2026-08-18T10:00:00.000Z',
  })
})

test('rejects malformed recovered insert payloads and unavailable local storage safely', () => {
  const key = `${assetRecoveryStorageKey}${projectId}:${assetId}`
  window.localStorage.setItem(key, JSON.stringify({
    ...recoveryItem('reconcile_insert'),
    asset: assetPayload({ permission_status: 'publishable' }),
    createdAt: '2026-08-18T10:00:00.000Z',
  }))

  expect(readAssetRecoveryItems()).toEqual([])
  expect(window.localStorage.getItem(key)).toBeNull()

  const unavailableStorage = {
    get length() { throw new Error('blocked') },
    key: () => { throw new Error('blocked') },
    getItem: () => { throw new Error('blocked') },
    setItem: () => { throw new Error('blocked') },
    removeItem: () => { throw new Error('blocked') },
  }
  expect(readAssetRecoveryItems(unavailableStorage)).toEqual([])
  expect(recordAssetRecovery(recoveryItem(), unavailableStorage)).toBe(false)
})

test('reissues a stored ambiguous insert idempotently and clears it on success', async () => {
  recordAssetRecovery(recoveryItem('reconcile_insert'))
  const mock = createClient()

  await expect(reconcileAssetRecovery(mock.client)).resolves.toEqual({
    resolved: 1,
    remaining: 0,
  })
  expect(mock.client.from).toHaveBeenCalledWith('studio_assets')
  expect(mock.insert).toHaveBeenCalledWith(assetPayload())
  expect(mock.select).toHaveBeenCalledWith(assetFields)
  expect(mock.single).toHaveBeenCalledOnce()
  expect(mock.maybeSingle).not.toHaveBeenCalled()
  expect(mock.remove).not.toHaveBeenCalled()
  expect(readAssetRecoveryItems()).toEqual([])
})

test('confirms a stored insert conflict only when the fetched row identity matches', async () => {
  const conflict = { code: '23505', message: 'duplicate key' }
  recordAssetRecovery(recoveryItem('reconcile_insert'))
  const mock = createClient({
    insertResult: { data: null, error: conflict, status: 409 },
    reconcileResult: { data: assetPayload(), error: null, status: 200 },
  })

  await expect(reconcileAssetRecovery(mock.client)).resolves.toEqual({
    resolved: 1,
    remaining: 0,
  })
  expect(mock.eq).toHaveBeenCalledWith('id', assetId)
  expect(mock.maybeSingle).toHaveBeenCalledOnce()
  expect(mock.remove).not.toHaveBeenCalled()
  expect(readAssetRecoveryItems()).toEqual([])
})

test('retains ambiguous inserts without deleting Storage', async () => {
  const ambiguous = { code: '', message: 'TypeError: fetch failed' }
  recordAssetRecovery(recoveryItem('reconcile_insert'))
  const mock = createClient({
    insertResult: { data: null, error: ambiguous, status: 0 },
  })

  await expect(reconcileAssetRecovery(mock.client)).resolves.toEqual({
    resolved: 0,
    remaining: 1,
  })
  expect(mock.remove).not.toHaveBeenCalled()
  expect(readAssetRecoveryItems()).toEqual([
    expect.objectContaining(recoveryItem('reconcile_insert')),
  ])
})

test('resolving A never erases B recorded while A recovery is in flight', async () => {
  const cleanup = deferred()
  recordAssetRecovery(recoveryItem('cleanup'))
  const mock = createClient()
  mock.remove.mockReturnValueOnce(cleanup.promise)

  const recovery = reconcileAssetRecovery(mock.client)
  await vi.waitFor(() => expect(mock.remove).toHaveBeenCalledWith([storagePath]))

  expect(recordAssetRecovery(recoveryItem('cleanup', {
    assetId: secondAssetId,
    storagePath: secondStoragePath,
  }))).toBe(true)
  cleanup.resolve({ data: null, error: null })

  await expect(recovery).resolves.toEqual({ resolved: 1, remaining: 1 })
  expect(readAssetRecoveryItems()).toEqual([expect.objectContaining({
    kind: 'cleanup',
    assetId: secondAssetId,
    projectId,
    storagePath: secondStoragePath,
  })])
})
