import { useState } from 'react'

export default function BrandImage({ src, alt, ...imageProps }) {
  const [failedSrc, setFailedSrc] = useState('')
  const failed = failedSrc === src

  if (failed) {
    return (
      <div
        className="image-fallback"
        role="img"
        aria-label={`${alt}（圖片暫時無法顯示）`}
      >
        <span>柏鎮園藝</span>
        <strong>{alt}</strong>
      </div>
    )
  }

  return (
    <img
      {...imageProps}
      src={src}
      alt={alt}
      onError={() => setFailedSrc(src)}
    />
  )
}
