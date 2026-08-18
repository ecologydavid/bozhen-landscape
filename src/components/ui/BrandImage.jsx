import { useState } from 'react'

const normalizeSource = (source) => (
  typeof source === 'string' ? { src: source, avifSrc: '' } : source
)

export default function BrandImage({ src, alt, onError, className, ...imageProps }) {
  const media = normalizeSource(src)
  const [failedSrc, setFailedSrc] = useState('')
  const failed = failedSrc === media.src

  if (failed) {
    return (
      <div
        className={`image-fallback ${className ?? ''}`.trim()}
        role="img"
        aria-label={`${alt}（圖片暫時無法顯示）`}
      >
        <span>曜聖景觀</span>
        <strong>{alt}</strong>
      </div>
    )
  }

  return (
    <picture>
      {media.avifSrc ? <source srcSet={media.avifSrc} type="image/avif" /> : null}
      <img
        {...imageProps}
        className={className}
        src={media.src}
        alt={alt}
        onError={(event) => {
          setFailedSrc(media.src)
          onError?.(event)
        }}
      />
    </picture>
  )
}
