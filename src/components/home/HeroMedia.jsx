import { useEffect, useState } from 'react'
import BrandImage from '../ui/BrandImage'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

function getReducedMotionPreference() {
  return window.matchMedia?.(reducedMotionQuery).matches ?? false
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(getReducedMotionPreference)

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(reducedMotionQuery)
    if (!mediaQuery) return undefined

    const updatePreference = (event) => setReducedMotion(event.matches)
    mediaQuery.addEventListener?.('change', updatePreference)
    return () => mediaQuery.removeEventListener?.('change', updatePreference)
  }, [])

  return reducedMotion
}

export default function HeroMedia({ image, alt, videoSrc }) {
  const reducedMotion = useReducedMotion()
  const [videoFailed, setVideoFailed] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const shouldPlayVideo = Boolean(videoSrc) && !reducedMotion && !videoFailed

  return (
    <div className="hero__media">
      <BrandImage
        className="hero__image"
        src={image}
        alt={alt}
        sizes="(max-width: 768px) calc(100vw - 52px), (max-width: 1280px) 54vw, 720px"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
      {shouldPlayVideo ? (
        <video
          data-testid="hero-video"
          className={`hero__video${videoReady ? ' is-ready' : ''}`}
          src={videoSrc}
          poster={image.src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        />
      ) : null}
      <div className="hero__shade" aria-hidden="true" />
      <span className="hero__sun" aria-hidden="true" />
    </div>
  )
}
