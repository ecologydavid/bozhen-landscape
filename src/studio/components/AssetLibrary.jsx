import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  AssetPermissionConflictError,
  createAssetPreviewUrl,
  getAsset,
  listAssets,
  updateAssetPermission,
} from '../api/assets'
import { supabase } from '../lib/supabase'
import AssetCard from './AssetCard'

const defaultPageSize = 24
const maximumPreviewConcurrency = 4

function defaultConfirm(message) {
  return window.confirm(message)
}

function epochSnapshot(epochs) {
  return new Map(epochs)
}

export default function AssetLibrary({
  client = supabase,
  projectId,
  refreshToken = 0,
  confirm = defaultConfirm,
  pageSize = defaultPageSize,
}) {
  const headingId = useId()
  const projectGenerationRef = useRef(0)
  const listRevisionRef = useRef(0)
  const retryTokenRef = useRef(0)
  const loadMoreInFlightRef = useRef(false)
  const mutationLocksRef = useRef(new Set())
  const mutationEpochsRef = useRef(new Map())
  const previewPoolRef = useRef(null)
  const assetsRef = useRef([])
  const previewsRef = useRef({})
  const nextOffsetRef = useRef(0)
  const [assets, setAssets] = useState([])
  const [previews, setPreviews] = useState({})
  const [permissionErrors, setPermissionErrors] = useState({})
  const [pendingPermissions, setPendingPermissions] = useState({})
  const [loadState, setLoadState] = useState('loading')
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState('')
  const [retryToken, setRetryToken] = useState(0)

  const isCurrentProject = useCallback((generation) => (
    projectGenerationRef.current === generation
  ), [])

  const replaceAssets = useCallback((nextAssets) => {
    assetsRef.current = nextAssets
    setAssets(nextAssets)
  }, [])

  const mutateAssets = useCallback((updater) => {
    const nextAssets = updater(assetsRef.current)
    assetsRef.current = nextAssets
    setAssets(nextAssets)
  }, [])

  const replacePreviews = useCallback((nextPreviews) => {
    previewsRef.current = nextPreviews
    setPreviews(nextPreviews)
  }, [])

  const mutatePreviews = useCallback((updater) => {
    const nextPreviews = updater(previewsRef.current)
    previewsRef.current = nextPreviews
    setPreviews(nextPreviews)
  }, [])

  const drainPreviewPool = useCallback(function drain(pool) {
    if (pool.cancelled || previewPoolRef.current !== pool) return

    while (pool.active < maximumPreviewConcurrency && pool.queue.length > 0) {
      const job = pool.queue.shift()
      if (pool.tokens.get(job.asset.id) !== job.token) continue
      pool.active += 1

      createAssetPreviewUrl(client, job.asset.storage_path)
        .then((url) => {
          if (
            pool.cancelled
            || previewPoolRef.current !== pool
            || pool.tokens.get(job.asset.id) !== job.token
          ) return
          mutatePreviews((current) => ({
            ...current,
            [job.asset.id]: { status: 'ready', url },
          }))
        })
        .catch(() => {
          if (
            pool.cancelled
            || previewPoolRef.current !== pool
            || pool.tokens.get(job.asset.id) !== job.token
          ) return
          mutatePreviews((current) => ({
            ...current,
            [job.asset.id]: { status: 'error', url: '' },
          }))
        })
        .finally(() => {
          pool.active -= 1
          drain(pool)
        })
    }
  }, [client, mutatePreviews])

  const enqueuePreviews = useCallback((rows, force = false) => {
    const pool = previewPoolRef.current
    if (!pool || pool.cancelled) return
    const nextPreviews = { ...previewsRef.current }
    let changed = false

    for (const asset of rows) {
      const current = nextPreviews[asset.id]
      if (!force && (current?.status === 'ready' || current?.status === 'loading')) continue
      const token = pool.nextToken + 1
      pool.nextToken = token
      pool.tokens.set(asset.id, token)
      pool.queue.push({ asset, token })
      nextPreviews[asset.id] = { status: 'loading', url: '' }
      changed = true
    }

    if (changed) replacePreviews(nextPreviews)
    drainPreviewPool(pool)
  }, [drainPreviewPool, replacePreviews])

  const mergeMutationRows = useCallback((rows, snapshot) => {
    const currentById = new Map(assetsRef.current.map((asset) => [asset.id, asset]))
    return rows.map((row) => {
      const capturedEpoch = snapshot.get(row.id) || 0
      const currentEpoch = mutationEpochsRef.current.get(row.id) || 0
      const current = currentById.get(row.id)
      if (current && currentEpoch > capturedEpoch) {
        return {
          ...row,
          permission_status: current.permission_status,
          updated_at: current.updated_at,
        }
      }
      return row
    })
  }, [])

  const bumpMutationEpoch = useCallback((assetId) => {
    const nextEpoch = (mutationEpochsRef.current.get(assetId) || 0) + 1
    mutationEpochsRef.current.set(assetId, nextEpoch)
  }, [])

  const applyAssetRow = useCallback((row) => {
    if (!row) return
    mutateAssets((current) => current.map((asset) => (
      asset.id === row.id ? { ...asset, ...row } : asset
    )))
  }, [mutateAssets])

  useEffect(() => {
    projectGenerationRef.current += 1
    const generation = projectGenerationRef.current
    const mutationLocks = mutationLocksRef.current
    listRevisionRef.current += 1
    mutationLocks.clear()
    mutationEpochsRef.current.clear()
    loadMoreInFlightRef.current = false
    const pool = {
      active: 0,
      cancelled: false,
      nextToken: 0,
      queue: [],
      tokens: new Map(),
    }
    previewPoolRef.current = pool

    Promise.resolve().then(() => {
      if (!isCurrentProject(generation)) return
      replaceAssets([])
      replacePreviews({})
      setPermissionErrors({})
      setPendingPermissions({})
      setLoadState('loading')
      setHasMore(false)
      setIsLoadingMore(false)
      setLoadMoreError('')
      nextOffsetRef.current = 0
    })

    return () => {
      pool.cancelled = true
      if (isCurrentProject(generation)) projectGenerationRef.current += 1
      listRevisionRef.current += 1
      mutationLocks.clear()
    }
  }, [client, isCurrentProject, projectId, replaceAssets, replacePreviews])

  useEffect(() => {
    const generation = projectGenerationRef.current
    const revision = listRevisionRef.current + 1
    listRevisionRef.current = revision
    const snapshot = epochSnapshot(mutationEpochsRef.current)

    Promise.resolve().then(() => {
      if (!isCurrentProject(generation) || listRevisionRef.current !== revision) return
      setLoadState(assetsRef.current.length > 0 ? 'refreshing' : 'loading')
      setLoadMoreError('')
      setIsLoadingMore(false)
      loadMoreInFlightRef.current = false
    })

    listAssets(client, projectId, { limit: pageSize, offset: 0 })
      .then((rows) => {
        if (!isCurrentProject(generation) || listRevisionRef.current !== revision) return
        const mergedRows = mergeMutationRows(rows, snapshot)
        const rowIds = new Set(mergedRows.map((row) => row.id))
        const pendingMissingRows = assetsRef.current.filter((asset) => (
          mutationLocksRef.current.has(asset.id) && !rowIds.has(asset.id)
        ))
        replaceAssets([...mergedRows, ...pendingMissingRows])
        nextOffsetRef.current = rows.length
        setHasMore(rows.length === pageSize)
        setLoadState('ready')
        enqueuePreviews(mergedRows)
      })
      .catch(() => {
        if (!isCurrentProject(generation) || listRevisionRef.current !== revision) return
        setLoadState('error')
      })
  }, [
    client,
    enqueuePreviews,
    isCurrentProject,
    mergeMutationRows,
    pageSize,
    projectId,
    refreshToken,
    replaceAssets,
    retryToken,
  ])

  async function handleLoadMore() {
    if (loadMoreInFlightRef.current || !hasMore) return
    const generation = projectGenerationRef.current
    const revision = listRevisionRef.current
    const offset = nextOffsetRef.current
    const snapshot = epochSnapshot(mutationEpochsRef.current)
    loadMoreInFlightRef.current = true
    setIsLoadingMore(true)
    setLoadMoreError('')

    try {
      const rows = await listAssets(client, projectId, { limit: pageSize, offset })
      if (!isCurrentProject(generation) || listRevisionRef.current !== revision) return
      const mergedRows = mergeMutationRows(rows, snapshot)
      const nextById = new Map(assetsRef.current.map((asset) => [asset.id, asset]))
      for (const row of mergedRows) nextById.set(row.id, row)
      replaceAssets([...nextById.values()])
      nextOffsetRef.current = offset + rows.length
      setHasMore(rows.length === pageSize)
      enqueuePreviews(mergedRows)
    } catch {
      if (!isCurrentProject(generation) || listRevisionRef.current !== revision) return
      setLoadMoreError('無法載入更多素材，請再試一次。')
    } finally {
      if (isCurrentProject(generation) && listRevisionRef.current === revision) {
        loadMoreInFlightRef.current = false
        setIsLoadingMore(false)
      }
    }
  }

  async function handlePermissionChange(asset, nextStatus) {
    const previousStatus = asset.permission_status
    if (nextStatus === previousStatus || mutationLocksRef.current.has(asset.id)) return

    if (nextStatus === 'forbidden' || previousStatus === 'forbidden') {
      const confirmed = confirm(
        '此變更會影響素材是否可用於生成內容。設為「不可用於生成」後會完全排除；從此狀態恢復則可能再次進入生成流程。確定繼續？',
      )
      if (!confirmed) return
    }

    const generation = projectGenerationRef.current
    mutationLocksRef.current.add(asset.id)
    bumpMutationEpoch(asset.id)
    setPendingPermissions((current) => ({ ...current, [asset.id]: true }))
    setPermissionErrors((current) => ({ ...current, [asset.id]: '' }))

    try {
      const updated = await updateAssetPermission(client, asset.id, nextStatus, {
        expectedUpdatedAt: asset.updated_at,
        expectedPermissionStatus: previousStatus,
      })
      if (!isCurrentProject(generation)) return
      bumpMutationEpoch(asset.id)
      applyAssetRow(updated)

      try {
        const currentRow = await getAsset(client, asset.id)
        if (isCurrentProject(generation) && currentRow) {
          bumpMutationEpoch(asset.id)
          applyAssetRow(currentRow)
        }
      } catch {
        // The successful CAS response remains authoritative if reconciliation fails.
      }
    } catch (error) {
      if (!isCurrentProject(generation)) return
      if (error instanceof AssetPermissionConflictError) {
        try {
          const currentRow = await getAsset(client, asset.id)
          if (isCurrentProject(generation) && currentRow) {
            bumpMutationEpoch(asset.id)
            applyAssetRow(currentRow)
          }
        } catch {
          // The conflict remains safe even if the current row cannot be reloaded.
        }
        if (isCurrentProject(generation)) {
          setPermissionErrors((current) => ({
            ...current,
            [asset.id]: '權限已被其他操作更新，請確認最新狀態後再試。',
          }))
        }
      } else {
        setPermissionErrors((current) => ({
          ...current,
          [asset.id]: '無法更新使用權限，請再試一次。',
        }))
      }
    } finally {
      if (isCurrentProject(generation)) {
        mutationLocksRef.current.delete(asset.id)
        setPendingPermissions((current) => ({ ...current, [asset.id]: false }))
      }
    }
  }

  function handleImageError(asset, failedUrl) {
    const current = previewsRef.current[asset.id]
    if (current?.status !== 'ready' || current.url !== failedUrl) return
    mutatePreviews((previewState) => ({
      ...previewState,
      [asset.id]: { status: 'error', url: '' },
    }))
  }

  const previewLoadingCount = assets.filter((asset) => (
    !previews[asset.id] || previews[asset.id].status === 'loading'
  )).length
  const hasAssets = assets.length > 0
  const isInitialLoading = loadState === 'loading' && !hasAssets
  const isAggregateLoading = loadState === 'refreshing'
    || previewLoadingCount > 0
    || isLoadingMore
  const aggregateLoadingMessage = isLoadingMore
    ? '正在載入更多素材…'
    : loadState === 'refreshing'
      ? '正在重新整理素材…'
      : `正在準備 ${previewLoadingCount} 張私有預覽…`

  return (
    <section
      className="studio-asset-library"
      aria-labelledby={headingId}
      aria-busy={isInitialLoading || isAggregateLoading}
    >
      <div className="studio-asset-library-heading">
        <div>
          <p className="studio-eyebrow">私有素材</p>
          <h2 id={headingId}>素材庫</h2>
        </div>
        <p>每張圖片都必須確認使用權限後，才能安全用於內容製作。</p>
      </div>

      {isInitialLoading ? (
        <div className="studio-asset-library-state" role="status" aria-live="polite">
          正在載入素材…
        </div>
      ) : null}

      {loadState === 'error' && !hasAssets ? (
        <div className="studio-asset-library-state studio-asset-library-state-error">
          <p role="alert">無法載入素材，請再試一次。</p>
          <button
            type="button"
            onClick={() => {
              retryTokenRef.current += 1
              setRetryToken(retryTokenRef.current)
            }}
          >
            重新載入素材
          </button>
        </div>
      ) : null}

      {loadState === 'error' && hasAssets ? (
        <p className="studio-asset-card-error" role="alert">無法重新整理素材，目前顯示上次載入的結果。</p>
      ) : null}

      {loadState === 'ready' && !hasAssets ? (
        <div className="studio-asset-library-state">尚未上傳素材。</div>
      ) : null}

      {hasAssets ? (
        <>
          {isAggregateLoading ? (
            <p className="studio-asset-preview-status" role="status" aria-live="polite">
              {aggregateLoadingMessage}
            </p>
          ) : null}
          <div className="studio-asset-grid">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                headingId={headingId}
                pendingPermission={Boolean(pendingPermissions[asset.id])}
                permissionError={permissionErrors[asset.id]}
                preview={previews[asset.id] || { status: 'loading', url: '' }}
                onImageError={handleImageError}
                onPermissionChange={handlePermissionChange}
                onPreviewRetry={(retryAsset) => enqueuePreviews([retryAsset], true)}
              />
            ))}
          </div>
          {loadMoreError ? <p className="studio-asset-card-error" role="alert">{loadMoreError}</p> : null}
          {hasMore ? (
            <button
              className="studio-asset-load-more"
              type="button"
              disabled={isLoadingMore}
              onClick={handleLoadMore}
            >
              {isLoadingMore ? '載入中…' : '載入更多'}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
