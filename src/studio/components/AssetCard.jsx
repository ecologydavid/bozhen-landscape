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

export default function AssetCard({
  asset,
  headingId,
  pendingPermission,
  permissionError,
  preview,
  onImageError,
  onPermissionChange,
  onPreviewRetry,
}) {
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
      aria-label={asset.original_name}
      data-permission={asset.permission_status}
      data-processing={asset.processing_status}
    >
      <div className="studio-asset-preview">
        {preview.status === 'ready' ? (
          <img
            src={preview.url}
            alt={`${asset.original_name} 預覽`}
            loading="lazy"
            decoding="async"
            onError={() => onImageError(asset, preview.url)}
          />
        ) : null}
        {preview.status === 'loading' ? <span>正在取得私有預覽…</span> : null}
        {preview.status === 'error' ? (
          <div className="studio-asset-preview-error">
            <span role="alert">無法載入預覽。</span>
            <button
              type="button"
              aria-label={`重新載入 ${asset.original_name} 預覽`}
              onClick={() => onPreviewRetry(asset)}
            >
              重新取得預覽
            </button>
          </div>
        ) : null}
      </div>

      <div className="studio-asset-card-body">
        <div className="studio-asset-card-title">
          <h3>{asset.original_name}</h3>
          <span className="studio-asset-processing" data-processing={asset.processing_status}>
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
            disabled={pendingPermission}
            onChange={(event) => onPermissionChange(asset, event.target.value)}
          >
            {Object.entries(permissionLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {permissionError ? (
            <p className="studio-asset-card-error" role="alert">{permissionError}</p>
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
}
