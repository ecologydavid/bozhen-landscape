import { beforeEach, expect, test, vi } from 'vitest'
import {
  assetRecoveryStorageKey,
  readAssetRecoveryItems,
  reconcileAssetRecovery,
  recordAssetRecovery,
} from './assetRecovery'

const projectId = '11111111-1111-4111-8111-111111111111'
const assetId = '22222222-2222-4222-8222-222222222222'
const storagePath = `raw/${projectId}/${assetId}.jpg`
const assetFields = 'id, project_id, storage_path, original_name, mime_type, size_bytes, permission_status, created_by, created_at'

function recoveryItem(kind = 'cleanup') {
  return { kind, assetId, projectId, storagePath }
}

function createReadClient(result) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const remove = vi.fn().mockResolvedValue({ data: null, error: null })
  const client = {
    from: vi.fn(() => ({ select })),
    storage: { from: vi.fn(() => ({ remove })) },
  }
  return { client, select, eq, maybeSingle, remove }
}

beforeEach(() => {
  window.localStorage.clear()
})

test('stores only validated repair identifiers and deduplicates by asset and path', () => {
  const now = () => '2026-08-18T10:00:00.000Z'

  expect(recordAssetRecovery({
    ...recoveryItem(),
    secret: 'must-not-persist',
    originalName: 'private-client-name.jpg',
  }, window.localStorage, now)).toBe(true)
  expect(recordAssetRecovery(recoveryItem(), window.localStorage, now)).toBe(true)

  expect(JSON.parse(window.localStorage.getItem(assetRecoveryStorageKey))).toEqual([{
    kind: 'cleanup',
    assetId,
    projectId,
    storagePath,
    createdAt: '2026-08-18T10:00:00.000Z',
  }])
})

test('malformed and unavailable local storage fail safely', () => {
  window.localStorage.setItem(assetRecoveryStorageKey, '{invalid')

  expect(readAssetRecoveryItems()).toEqual([])
  expect(window.localStorage.getItem(assetRecoveryStorageKey)).toBeNull()

  const unavailableStorage = {
    getItem: () => { throw new Error('blocked') },
    setItem: () => { throw new Error('blocked') },
    removeItem: () => { throw new Error('blocked') },
  }
  expect(() => readAssetRecoveryItems(unavailableStorage)).not.toThrow()
  expect(readAssetRecoveryItems(unavailableStorage)).toEqual([])
  expect(() => recordAssetRecovery(recoveryItem(), unavailableStorage)).not.toThrow()
  expect(recordAssetRecovery(recoveryItem(), unavailableStorage)).toBe(false)
})

test('retries a cleanup entry and removes it from the outbox when resolved', async () => {
  recordAssetRecovery(recoveryItem())
  const mock = createReadClient({ data: null, error: null })

  await expect(reconcileAssetRecovery(mock.client)).resolves.toEqual({
    resolved: 1,
    remaining: 0,
  })
  expect(mock.client.storage.from).toHaveBeenCalledWith('studio-assets')
  expect(mock.remove).toHaveBeenCalledWith([storagePath])
  expect(mock.client.from).not.toHaveBeenCalled()
  expect(readAssetRecoveryItems()).toEqual([])
})

test('confirms an ambiguous insert by id without deleting its stored object', async () => {
  const row = { id: assetId, storage_path: storagePath }
  recordAssetRecovery(recoveryItem('reconcile_insert'))
  const mock = createReadClient({ data: row, error: null, status: 200 })

  await expect(reconcileAssetRecovery(mock.client)).resolves.toEqual({
    resolved: 1,
    remaining: 0,
  })
  expect(mock.client.from).toHaveBeenCalledWith('studio_assets')
  expect(mock.select).toHaveBeenCalledWith(assetFields)
  expect(mock.eq).toHaveBeenCalledWith('id', assetId)
  expect(mock.maybeSingle).toHaveBeenCalledOnce()
  expect(mock.remove).not.toHaveBeenCalled()
  expect(readAssetRecoveryItems()).toEqual([])
})

test('retains failed reconciliation and never deletes without confirmed absence', async () => {
  const queryError = { message: 'FetchError: network', code: '' }
  recordAssetRecovery(recoveryItem('reconcile_insert'))
  const mock = createReadClient({ data: null, error: queryError, status: 0 })

  await expect(reconcileAssetRecovery(mock.client)).resolves.toEqual({
    resolved: 0,
    remaining: 1,
  })
  expect(mock.remove).not.toHaveBeenCalled()
  expect(readAssetRecoveryItems()).toEqual([expect.objectContaining(
    recoveryItem('reconcile_insert'),
  )])
})

test('confirmed database absence retries cleanup and retains unresolved cleanup work', async () => {
  const cleanupError = new Error('cleanup unavailable')
  recordAssetRecovery(recoveryItem('reconcile_insert'))
  const mock = createReadClient({ data: null, error: null, status: 200 })
  mock.remove.mockResolvedValue({ data: null, error: cleanupError })

  await expect(reconcileAssetRecovery(mock.client)).resolves.toEqual({
    resolved: 0,
    remaining: 1,
  })
  expect(mock.maybeSingle.mock.invocationCallOrder[0]).toBeLessThan(
    mock.remove.mock.invocationCallOrder[0],
  )
  expect(readAssetRecoveryItems()).toEqual([expect.objectContaining({
    ...recoveryItem('cleanup'),
  })])
})
