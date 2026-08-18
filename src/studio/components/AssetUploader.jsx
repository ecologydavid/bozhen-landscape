import { useEffect, useId, useRef, useState } from 'react'
import { uploadAsset } from '../api/assets'
import { supabase } from '../lib/supabase'
import { acceptedImageTypes, assetFileSchema } from '../schemas/asset'

const statusLabels = {
  waiting: '等待中',
  uploading: '上傳中',
  success: '上傳成功',
  failure: '上傳失敗',
}

export default function AssetUploader({
  client = supabase,
  projectId,
  onUploaded,
  upload = uploadAsset,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const lifecycleGenerationRef = useRef(0)
  const activeGenerationRef = useRef(null)
  const processingRef = useRef(false)
  const batchRef = useRef(0)
  const [items, setItems] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    lifecycleGenerationRef.current += 1
    const generation = lifecycleGenerationRef.current
    activeGenerationRef.current = generation

    return () => {
      if (activeGenerationRef.current === generation) {
        activeGenerationRef.current = null
        processingRef.current = false
      }
    }
  }, [])

  function isActiveGeneration(generation) {
    return activeGenerationRef.current === generation
  }

  function updateItem(itemId, nextStatus, generation) {
    if (!isActiveGeneration(generation)) return
    setItems((currentItems) => currentItems.map((item) => (
      item.id === itemId ? { ...item, status: nextStatus } : item
    )))
  }

  async function handleFilesSelected(event) {
    if (processingRef.current) return

    const generation = activeGenerationRef.current
    if (!isActiveGeneration(generation)) return

    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    processingRef.current = true
    batchRef.current += 1
    const batchId = batchRef.current
    const nextItems = files.map((file, index) => ({
      id: `${batchId}-${index}`,
      file,
      name: file.name,
      status: 'waiting',
    }))

    setItems(nextItems)
    setErrorMessage('')
    setIsProcessing(true)

    const safeErrors = []
    let callbackFailed = false

    try {
      for (const item of nextItems) {
        if (!isActiveGeneration(generation)) return

        const validation = assetFileSchema.safeParse(item.file)
        if (!validation.success) {
          safeErrors.push(validation.error.issues[0].message)
          updateItem(item.id, 'failure', generation)
          continue
        }

        updateItem(item.id, 'uploading', generation)
        let row

        try {
          row = await upload(client, projectId, validation.data)
        } catch {
          if (!isActiveGeneration(generation)) return
          safeErrors.push('圖片上傳失敗，請再試一次。')
          updateItem(item.id, 'failure', generation)
          continue
        }

        if (!isActiveGeneration(generation)) return
        updateItem(item.id, 'success', generation)

        try {
          await onUploaded?.(row)
        } catch {
          if (!isActiveGeneration(generation)) return
          callbackFailed = true
        }
      }

      if (isActiveGeneration(generation) && (safeErrors.length > 0 || callbackFailed)) {
        const uploadMessage = safeErrors.length > 0
          ? (files.length === 1
            ? safeErrors[0]
            : '部分圖片上傳失敗，請再試一次。')
          : ''
        const callbackMessage = callbackFailed
          ? '素材已上傳，但畫面更新失敗，請重新整理。'
          : ''
        setErrorMessage([uploadMessage, callbackMessage].filter(Boolean).join(' '))
      }
    } finally {
      if (isActiveGeneration(generation)) {
        processingRef.current = false
        if (inputRef.current) inputRef.current.value = ''
        setIsProcessing(false)
      }
    }
  }

  return (
    <section className="studio-asset-uploader" aria-labelledby={`${inputId}-heading`}>
      <div className="studio-asset-uploader-heading">
        <div>
          <h2 id={`${inputId}-heading`}>上傳案場圖片</h2>
          <p>支援 JPG、PNG、WebP、HEIC，每張上限 25MB。</p>
        </div>
        <label className="studio-upload-button" htmlFor={inputId}>
          選擇圖片
        </label>
      </div>
      <input
        className="studio-visually-hidden"
        id={inputId}
        ref={inputRef}
        type="file"
        accept={acceptedImageTypes.join(',')}
        multiple
        disabled={isProcessing}
        onChange={handleFilesSelected}
      />
      <div className="studio-upload-status" role="status" aria-live="polite">
        {items.length === 0 ? (
          <p>尚未選擇圖片</p>
        ) : (
          <ul className="studio-upload-list">
            {items.map((item) => (
              <li key={item.id} data-status={item.status}>
                <span>{item.name}</span>
                <strong>{statusLabels[item.status]}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
      {errorMessage ? <p className="studio-upload-error" role="alert">{errorMessage}</p> : null}
    </section>
  )
}
