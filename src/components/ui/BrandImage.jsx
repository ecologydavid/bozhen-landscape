import { useState } from 'react'

const normalizeSource = (source) => (
  typeof source === 'string' ? { src: source, avifSrc: '' } : source
)

function BrandImageSource({ media, alt, onError, className, ...imageProps }) {
  const [failureStage, setFailureStage] = useState('')
  const avifFailed = failureStage === 'avif'
  const failed = failureStage === 'webp'

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
      {media.avifSrc && !avifFailed
        ? <source srcSet={media.avifSrc} type="image/avif" />
        : null}
      <img
        key={avifFailed ? 'webp' : 'preferred'}
        {...imageProps}
        className={className}
        src={media.src}
        alt={alt}
        onError={(event) => {
          if (media.avifSrc && !avifFailed) {
            setFailureStage('avif')
            return
          }
          setFailureStage('webp')
          onError?.(event)
        }}
      />
    </picture>
  )
}

export default function BrandImage({ src, ...imageProps }) {
  const media = normalizeSource(src)
  const mediaKey = `${media.src}\u0000${media.avifSrc}`
  return <BrandImageSource key={mediaKey} media={media} {...imageProps} />
}
