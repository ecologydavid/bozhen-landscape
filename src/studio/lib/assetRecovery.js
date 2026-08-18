const assetFields = 'id, project_id, storage_path, original_name, mime_type, size_bytes, permission_status, created_by, created_at'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const storagePathPattern = /^raw\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|png|webp|heic|heif)$/i
const recoveryKinds = new Set(['cleanup', 'reconcile_insert'])

export const assetRecoveryStorageKey = 'studio:asset-recovery:v1'

function localStorageOrNull() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function normalizeItem(item) {
  const pathMatch = typeof item?.storagePath === 'string'
    ? item.storagePath.match(storagePathPattern)
    : null
  const createdAt = typeof item?.createdAt === 'string' ? item.createdAt : ''

  if (
    !recoveryKinds.has(item?.kind)
    || !uuidPattern.test(item?.assetId || '')
    || !uuidPattern.test(item?.projectId || '')
    || !pathMatch
    || pathMatch[1].toLowerCase() !== item.projectId.toLowerCase()
    || pathMatch[2].toLowerCase() !== item.assetId.toLowerCase()
    || Number.isNaN(Date.parse(createdAt))
  ) {
    return null
  }

  return {
    kind: item.kind,
    assetId: item.assetId,
    projectId: item.projectId,
    storagePath: item.storagePath,
    createdAt,
  }
}

function clearStoredItems(storage) {
  try {
    storage?.removeItem(assetRecoveryStorageKey)
  } catch {
    // Recovery state is best-effort when browser storage is unavailable.
  }
}

function writeItems(items, storage) {
  try {
    if (!storage) return false
    if (items.length === 0) storage.removeItem(assetRecoveryStorageKey)
    else storage.setItem(assetRecoveryStorageKey, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

export function readAssetRecoveryItems(storage = localStorageOrNull()) {
  try {
    const rawItems = storage?.getItem(assetRecoveryStorageKey)
    if (!rawItems) return []
    const parsedItems = JSON.parse(rawItems)
    if (!Array.isArray(parsedItems)) throw new TypeError('Invalid asset recovery state')

    const items = parsedItems.map(normalizeItem).filter(Boolean)
    if (items.length !== parsedItems.length) writeItems(items, storage)
    return items
  } catch {
    clearStoredItems(storage)
    return []
  }
}

export function recordAssetRecovery(
  item,
  storage = localStorageOrNull(),
  now = () => new Date().toISOString(),
) {
  const normalizedItem = normalizeItem({ ...item, createdAt: now() })
  if (!normalizedItem) return false

  const existingItems = readAssetRecoveryItems(storage)
  const matchingIndex = existingItems.findIndex((existingItem) => (
    existingItem.assetId === normalizedItem.assetId
    && existingItem.storagePath === normalizedItem.storagePath
  ))
  const nextItems = [...existingItems]

  if (matchingIndex === -1) nextItems.push(normalizedItem)
  else nextItems[matchingIndex] = normalizedItem

  return writeItems(nextItems, storage)
}

async function assetExists(client, assetId) {
  try {
    const result = await client
      .from('studio_assets')
      .select(assetFields)
      .eq('id', assetId)
      .maybeSingle()

    if (result.error) return { status: 'unknown' }
    return result.data
      ? { status: 'committed' }
      : { status: 'absent' }
  } catch {
    return { status: 'unknown' }
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

export async function reconcileAssetRecovery(
  client,
  storage = localStorageOrNull(),
) {
  const items = readAssetRecoveryItems(storage)
  const remainingItems = []
  let resolved = 0

  for (const item of items) {
    if (item.kind === 'reconcile_insert') {
      const databaseState = await assetExists(client, item.assetId)
      if (databaseState.status === 'committed') {
        resolved += 1
        continue
      }
      if (databaseState.status === 'unknown') {
        remainingItems.push(item)
        continue
      }
    }

    if (await removeStoredObject(client, item.storagePath)) {
      resolved += 1
    } else {
      remainingItems.push({ ...item, kind: 'cleanup' })
    }
  }

  writeItems(remainingItems, storage)
  return { resolved, remaining: remainingItems.length }
}
