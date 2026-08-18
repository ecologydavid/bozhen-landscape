import { beforeEach, expect, test, vi } from 'vitest'
import {
  assetRecoveryLeaseMs,
  assetRecoveryStorageKey,
  readAssetRecoveryItems,
  reconcileAssetRecovery,
  recordAssetRecovery,
  triggerAssetRecovery,
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

test('canonicalizes uppercase identifiers in a valid cleanup record', () => {
  const uppercaseProjectId = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'
  const uppercaseAssetId = 'BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB'
  const lowercaseProjectId = uppercaseProjectId.toLowerCase()
  const lowercaseAssetId = uppercaseAssetId.toLowerCase()
  const lowercasePath = `raw/${lowercaseProjectId}/${lowercaseAssetId}.jpg`

  expect(recordAssetRecovery({
    kind: 'cleanup',
    assetId: uppercaseAssetId,
    projectId: uppercaseProjectId,
    storagePath: lowercasePath,
  })).toBe(true)
  expect(readAssetRecoveryItems()).toEqual([expect.objectContaining({
    kind: 'cleanup',
    assetId: lowercaseAssetId,
    projectId: lowercaseProjectId,
    storagePath: lowercasePath,
  })])
})

test('coalesces concurrent recovery drains and safely handles rejection', async () => {
  const drain = deferred()
  const client = {}
  const recover = vi.fn(() => drain.promise)

  const first = triggerAssetRecovery(client, recover)
  const second = triggerAssetRecovery(client, recover)

  expect(recover).toHaveBeenCalledOnce()
  expect(second).toBe(first)

  drain.resolve(Promise.reject(new Error('recovery failed')))
  await expect(first).resolves.toBeNull()

  await triggerAssetRecovery(client, recover)
  expect(recover).toHaveBeenCalledTimes(2)
})

test('expires a stuck drain lease without letting its late completion evict the replacement', async () => {
  const oldDrain = deferred()
  const replacementDrain = deferred()
  const client = {}
  let now = 1_000
  const recover = vi.fn()
    .mockReturnValueOnce(oldDrain.promise)
    .mockReturnValueOnce(replacementDrain.promise)
    .mockResolvedValueOnce({ resolved: 0, remaining: 0 })
  const options = { now: () => now, leaseMs: 30 }

  expect(assetRecoveryLeaseMs).toBe(30_000)
  const first = triggerAssetRecovery(client, recover, options)
  const coalesced = triggerAssetRecovery(client, recover, options)
  expect(coalesced).toBe(first)
  expect(recover).toHaveBeenCalledOnce()

  now += 31
  const replacement = triggerAssetRecovery(client, recover, options)
  expect(replacement).not.toBe(first)
  expect(recover).toHaveBeenCalledTimes(2)

  oldDrain.resolve({ resolved: 0, remaining: 1 })
  await first

  const stillReplacement = triggerAssetRecovery(client, recover, options)
  expect(stillReplacement).toBe(replacement)
  expect(recover).toHaveBeenCalledTimes(2)

  replacementDrain.resolve(Promise.reject(new Error('replacement failed')))
  await expect(replacement).resolves.toBeNull()

  await expect(triggerAssetRecovery(client, recover, options)).resolves.toEqual({
    resolved: 0,
    remaining: 0,
  })
  expect(recover).toHaveBeenCalledTimes(3)
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
