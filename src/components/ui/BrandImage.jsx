import { useState } from 'react'

export default function BrandImage({ src, alt, onError, ...imageProps }) {
  const [failedSrc, setFailedSrc] = useState('')
  const failed = failedSrc === src

  if (failed) {
    return (
      <div
        className="image-fallback"
        role="img"
        aria-label={`${alt}（圖片暫時無法顯示）`}
      >
        <span>曜聖景觀</span>
        <strong>{alt}</strong>
      </div>
    )
  }

  return (
    <img
      {...imageProps}
      src={src}
      alt={alt}
      onError={(event) => {
        setFailedSrc(src)
        onError?.(event)
      }}
    />
  )
}
