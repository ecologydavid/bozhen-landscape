const assetFields = 'id, project_id, storage_path, original_name, mime_type, size_bytes, permission_status, created_by, created_at'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const extensionByMimeType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}
const recoveryKinds = new Set(['cleanup', 'reconcile_insert'])
const recoveryDrainsByClient = new WeakMap()

export const assetRecoveryStorageKey = 'studio:asset-recovery:v1:'

function localStorageOrNull() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function normalizeAsset(asset, identifiers) {
  const extension = extensionByMimeType[asset?.mime_type]
  const expectedPath = extension
    ? `raw/${identifiers.projectId}/${identifiers.assetId}.${extension}`
    : ''

  if (
    asset?.id !== identifiers.assetId
    || asset?.project_id !== identifiers.projectId
    || asset?.storage_path !== identifiers.storagePath
    || asset.storage_path !== expectedPath
    || typeof asset?.original_name !== 'string'
    || asset.original_name.length < 1
    || asset.original_name.length > 1024
    || !extension
    || !Number.isInteger(asset?.size_bytes)
    || asset.size_bytes < 0
    || asset.size_bytes > 25 * 1024 * 1024
    || asset?.permission_status !== 'unconfirmed'
  ) {
    return null
  }

  // original_name is the sole user-originated value retained because the exact
  // database row cannot be replayed idempotently without it. No file data,
  // credentials, or raw service errors are stored.
  return {
    id: asset.id,
    project_id: asset.project_id,
    storage_path: asset.storage_path,
    original_name: asset.original_name,
    mime_type: asset.mime_type,
    size_bytes: asset.size_bytes,
    permission_status: 'unconfirmed',
  }
}

function normalizeItem(item) {
  const assetId = typeof item?.assetId === 'string' ? item.assetId.toLowerCase() : ''
  const projectId = typeof item?.projectId === 'string' ? item.projectId.toLowerCase() : ''
  const storagePath = typeof item?.storagePath === 'string' ? item.storagePath : ''
  const createdAt = typeof item?.createdAt === 'string' ? item.createdAt : ''
  const identifiers = { assetId, projectId, storagePath }
  const pathMatchesIdentifiers = Object.values(extensionByMimeType).some(
    (extension) => storagePath === `raw/${projectId}/${assetId}.${extension}`,
  )

  if (
    !recoveryKinds.has(item?.kind)
    || !uuidPattern.test(assetId)
    || !uuidPattern.test(projectId)
    || !pathMatchesIdentifiers
    || Number.isNaN(Date.parse(createdAt))
  ) {
    return null
  }

  const normalized = {
    kind: item.kind,
    assetId,
    projectId,
    storagePath,
    createdAt,
  }

  if (item.kind === 'reconcile_insert') {
    const asset = normalizeAsset(item.asset, identifiers)
    if (!asset) return null
    normalized.asset = asset
  }

  return normalized
}

function itemStorageKey(item) {
  return `${assetRecoveryStorageKey}${item.projectId}:${item.assetId}`
}

function removeStoredKey(storage, key) {
  try {
    storage?.removeItem(key)
  } catch {
    // Corrupt recovery state remains isolated when browser storage is blocked.
  }
}

function readEntries(storage) {
  try {
    if (!storage) return []
    const keys = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(assetRecoveryStorageKey)) keys.push(key)
    }

    return keys.flatMap((key) => {
      try {
        const raw = storage.getItem(key)
        const item = normalizeItem(JSON.parse(raw))
        if (!item || itemStorageKey(item) !== key) {
          removeStoredKey(storage, key)
          return []
        }
        return [{ key, raw, item }]
      } catch {
        removeStoredKey(storage, key)
        return []
      }
    })
  } catch {
    return []
  }
}

export function readAssetRecoveryItems(storage = localStorageOrNull()) {
  return readEntries(storage).map(({ item }) => item)
}

export function recordAssetRecovery(
  item,
  storage = localStorageOrNull(),
  now = () => new Date().toISOString(),
) {
  const normalizedItem = normalizeItem({ ...item, createdAt: now() })
  if (!normalizedItem) return false

  try {
    if (!storage) return false
    storage.setItem(itemStorageKey(normalizedItem), JSON.stringify(normalizedItem))
    return true
  } catch {
    return false
  }
}

export function assetRowsMatch(storedRow, expectedRow) {
  return [
    'id',
    'project_id',
    'storage_path',
    'original_name',
    'mime_type',
    'size_bytes',
    'permission_status',
  ].every((field) => storedRow?.[field] === expectedRow[field])
}

async function fetchAsset(client, assetId) {
  try {
    const result = await client
      .from('studio_assets')
      .select(assetFields)
      .eq('id', assetId)
      .maybeSingle()
    return result?.error ? null : result?.data
  } catch {
    return null
  }
}

async function retryStoredInsert(client, item) {
  try {
    const result = await client
      .from('studio_assets')
      .insert(item.asset)
      .select(assetFields)
      .single()

    if (!result?.error) return assetRowsMatch(result?.data, item.asset)
    if (result.error.code !== '23505') return false

    const storedRow = await fetchAsset(client, item.assetId)
    return assetRowsMatch(storedRow, item.asset)
  } catch {
    return false
  }
}

async function removeStoredObject(client, storagePath) {
  try {
    const { error } = await client.storage
      .from('studio-assets')
      .remove([storagePath])
    return !error
  } catch {
    return false
  }
}

function removeEntryIfUnchanged(storage, entry) {
  try {
    if (storage?.getItem(entry.key) !== entry.raw) return false
    storage.removeItem(entry.key)
    return true
  } catch {
    return false
  }
}

export async function reconcileAssetRecovery(
  client,
  storage = localStorageOrNull(),
) {
  const entries = readEntries(storage)
  let resolved = 0

  for (const entry of entries) {
    const repaired = entry.item.kind === 'reconcile_insert'
      ? await retryStoredInsert(client, entry.item)
      : await removeStoredObject(client, entry.item.storagePath)

    if (repaired && removeEntryIfUnchanged(storage, entry)) resolved += 1
  }

  return {
    resolved,
    remaining: readEntries(storage).length,
  }
}

export function triggerAssetRecovery(client, recover = reconcileAssetRecovery) {
  if (
    (typeof client !== 'object' && typeof client !== 'function')
    || client === null
    || typeof recover !== 'function'
  ) {
    return Promise.resolve(null)
  }

  let drainsByRecover = recoveryDrainsByClient.get(client)
  if (!drainsByRecover) {
    drainsByRecover = new WeakMap()
    recoveryDrainsByClient.set(client, drainsByRecover)
  }

  const activeDrain = drainsByRecover.get(recover)
  if (activeDrain) return activeDrain

  let recoveryResult
  try {
    recoveryResult = recover(client)
  } catch {
    return Promise.resolve(null)
  }

  let handledDrain
  handledDrain = Promise.resolve(recoveryResult)
    .catch(() => null)
    .finally(() => {
      if (drainsByRecover.get(recover) === handledDrain) {
        drainsByRecover.delete(recover)
      }
    })
  drainsByRecover.set(recover, handledDrain)
  return handledDrain
}
