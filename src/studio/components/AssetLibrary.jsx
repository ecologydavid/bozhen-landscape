import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  createAssetPreviewUrl,
  listAssets,
  updateAssetPermission,
} from '../api/assets'
import { supabase } from '../lib/supabase'

const permissionLabels = {
  unconfirmed: '尚未確認',
  publishable: '可公開',
  needs_redaction: '需模糊',
  forbidden: '不可用於生成',
}

const processingLabels = {
  uploaded: '已上傳',
  processing: '處理中',
  ready: '可使用',
  quarantined: '已隔離（不可使用）',
  failed: '處理失敗（不可使用）',
}

function formatSize(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return null
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function safePrivacyFlags(flags) {
  if (!Array.isArray(flags)) return []
  return flags
    .filter((flag) => typeof flag === 'string' && flag.trim() !== '')
    .map((flag) => flag.trim())
}

function defaultConfirm(message) {
  return window.confirm(message)
}

export default function AssetLibrary({
  client = supabase,
  projectId,
  refreshToken = 0,
  confirm = defaultConfirm,
}) {
  const headingId = useId()
  const generationRef = useRef(0)
  const permissionUpdatesRef = useRef(new Set())
  const [assets, setAssets] = useState([])
  const [previews, setPreviews] = useState({})
  const [permissionErrors, setPermissionErrors] = useState({})
  const [pendingPermissions, setPendingPermissions] = useState({})
  const [loadState, setLoadState] = useState('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)

  const isCurrent = useCallback((generation) => {
    return generationRef.current === generation
  }, [])

  const signPreview = useCallback(async (asset, generation = generationRef.current) => {
    if (!isCurrent(generation)) return
    setPreviews((current) => ({
      ...current,
      [asset.id]: { status: 'loading', url: '' },
    }))

    try {
      const url = await createAssetPreviewUrl(client, asset.storage_path)
      if (!isCurrent(generation)) return
      setPreviews((current) => ({
        ...current,
        [asset.id]: { status: 'ready', url },
      }))
    } catch {
      if (!isCurrent(generation)) return
      setPreviews((current) => ({
        ...current,
        [asset.id]: { status: 'error', url: '' },
      }))
    }
  }, [client, isCurrent])

  useEffect(() => {
    generationRef.current += 1
    const generation = generationRef.current
    const permissionUpdates = permissionUpdatesRef.current
    permissionUpdates.clear()
    Promise.resolve().then(() => {
      if (!isCurrent(generation)) return
      setAssets([])
      setPreviews({})
      setPermissionErrors({})
      setPendingPermissions({})
      setLoadState('loading')
    })

    listAssets(client, projectId)
      .then((rows) => {
        if (!isCurrent(generation)) return
        setAssets(rows)
        setLoadState('ready')
        for (const asset of rows) signPreview(asset, generation)
      })
      .catch(() => {
        if (!isCurrent(generation)) return
        setLoadState('error')
      })

    return () => {
      if (isCurrent(generation)) generationRef.current += 1
      permissionUpdates.clear()
    }
  }, [client, isCurrent, loadAttempt, projectId, refreshToken, signPreview])

  async function handlePermissionChange(asset, nextStatus) {
    const previousStatus = asset.permission_status
    if (nextStatus === previousStatus || permissionUpdatesRef.current.has(asset.id)) return

    if (nextStatus === 'forbidden' || previousStatus === 'forbidden') {
      const confirmed = confirm(
        '此變更會影響素材是否可用於生成內容。設為「不可用於生成」後會完全排除；從此狀態恢復則可能再次進入生成流程。確定繼續？',
      )
      if (!confirmed) return
    }

    const generation = generationRef.current
    permissionUpdatesRef.current.add(asset.id)
    setPendingPermissions((current) => ({ ...current, [asset.id]: true }))
    setPermissionErrors((current) => ({ ...current, [asset.id]: '' }))

    try {
      const updated = await updateAssetPermission(client, asset.id, nextStatus)
      if (!isCurrent(generation)) return
      setAssets((current) => current.map((item) => (
        item.id === asset.id
          ? { ...item, permission_status: updated.permission_status, updated_at: updated.updated_at }
          : item
      )))
    } catch {
      if (!isCurrent(generation)) return
      setPermissionErrors((current) => ({
        ...current,
        [asset.id]: '無法更新使用權限，請再試一次。',
      }))
    } finally {
      if (isCurrent(generation)) {
        permissionUpdatesRef.current.delete(asset.id)
        setPendingPermissions((current) => ({ ...current, [asset.id]: false }))
      }
    }
  }

  return (
    <section className="studio-asset-library" aria-labelledby={headingId}>
      <div className="studio-asset-library-heading">
        <div>
          <p className="studio-eyebrow">私有素材</p>
          <h2 id={headingId}>素材庫</h2>
        </div>
        <p>每張圖片都必須確認使用權限後，才能安全用於內容製作。</p>
      </div>

      {loadState === 'loading' ? (
        <div className="studio-asset-library-state" role="status" aria-live="polite">
          正在載入素材…
        </div>
      ) : null}

      {loadState === 'error' ? (
        <div className="studio-asset-library-state studio-asset-library-state-error">
          <p role="alert">無法載入素材，請再試一次。</p>
          <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
            重新載入素材
          </button>
        </div>
      ) : null}

      {loadState === 'ready' && assets.length === 0 ? (
        <div className="studio-asset-library-state">尚未上傳素材。</div>
      ) : null}

      {loadState === 'ready' && assets.length > 0 ? (
        <div className="studio-asset-grid">
          {assets.map((asset) => {
            const preview = previews[asset.id] || { status: 'loading', url: '' }
            const flags = safePrivacyFlags(asset.privacy_flags)
            const size = formatSize(asset.size_bytes)
            const dimensions = Number.isFinite(asset.width) && Number.isFinite(asset.height)
              ? `${asset.width} × ${asset.height} px`
              : null
            const permissionLabel = permissionLabels[asset.permission_status] || permissionLabels.unconfirmed
            const processingLabel = processingLabels[asset.processing_status] || '狀態未知'
            const selectorId = `${headingId}-${asset.id}-permission`

            return (
              <article
                className="studio-asset-card"
                key={asset.id}
                aria-label={asset.original_name}
                data-permission={asset.permission_status}
                data-processing={asset.processing_status}
              >
                <div className="studio-asset-preview">
                  {preview.status === 'ready' ? (
                    <img src={preview.url} alt={`${asset.original_name} 預覽`} />
                  ) : null}
                  {preview.status === 'loading' ? (
                    <span role="status">正在取得私有預覽…</span>
                  ) : null}
                  {preview.status === 'error' ? (
                    <div className="studio-asset-preview-error">
                      <span role="alert">無法載入預覽。</span>
                      <button
                        type="button"
                        aria-label={`重新載入 ${asset.original_name} 預覽`}
                        onClick={() => signPreview(asset)}
                      >
                        重新取得預覽
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="studio-asset-card-body">
                  <div className="studio-asset-card-title">
                    <h3>{asset.original_name}</h3>
                    <span
                      className="studio-asset-processing"
                      data-processing={asset.processing_status}
                    >
                      {processingLabel}
                    </span>
                  </div>

                  <dl className="studio-asset-meta">
                    {dimensions ? <div><dt>尺寸</dt><dd>{dimensions}</dd></div> : null}
                    {size ? <div><dt>檔案大小</dt><dd>{size}</dd></div> : null}
                  </dl>

                  <div className="studio-asset-permission">
                    <div className="studio-asset-permission-heading">
                      <label htmlFor={selectorId}>使用權限</label>
                      <strong>{permissionLabel}</strong>
                    </div>
                    <select
                      id={selectorId}
                      aria-label={`${asset.original_name} 使用權限`}
                      value={asset.permission_status}
                      disabled={Boolean(pendingPermissions[asset.id])}
                      onChange={(event) => handlePermissionChange(asset, event.target.value)}
                    >
                      {Object.entries(permissionLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {permissionErrors[asset.id] ? (
                      <p className="studio-asset-card-error" role="alert">
                        {permissionErrors[asset.id]}
                      </p>
                    ) : null}
                  </div>

                  <div className="studio-asset-privacy">
                    <h4>隱私標記</h4>
                    {flags.length > 0 ? (
                      <ul>{flags.map((flag, index) => <li key={`${flag}-${index}`}>{flag}</li>)}</ul>
                    ) : <p>無隱私標記</p>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
