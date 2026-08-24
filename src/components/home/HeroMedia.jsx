import { useEffect, useState } from 'react'
import BrandImage from '../ui/BrandImage'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

function getMediaPreference(query) {
  return typeof window !== 'undefined' && window.matchMedia?.(query).matches === true
}

function useMediaPreference(query) {
  const [matches, setMatches] = useState(() => getMediaPreference(query))

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(query)
    if (!mediaQuery) return undefined

    const updatePreference = (event) => setMatches(event.matches)
    mediaQuery.addEventListener?.('change', updatePreference)
    return () => mediaQuery.removeEventListener?.('change', updatePreference)
  }, [query])

  return matches
}

function getDataSavingPreference() {
  return typeof navigator !== 'undefined' && navigator.connection?.saveData === true
}

function useDataSavingPreference() {
  const [saveData, setSaveData] = useState(getDataSavingPreference)

  useEffect(() => {
    if (typeof navigator === 'undefined') return undefined

    const connection = navigator.connection
    if (!connection?.addEventListener) return undefined

    const updatePreference = () => setSaveData(getDataSavingPreference())
    connection.addEventListener('change', updatePreference)
    return () => connection.removeEventListener?.('change', updatePreference)
  }, [])

  return saveData
}

export default function HeroMedia({ image, alt, videoSrc }) {
  const reducedMotion = useMediaPreference(reducedMotionQuery)
  const saveData = useDataSavingPreference()
  const [videoFailed, setVideoFailed] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const shouldPlayVideo = Boolean(videoSrc) && !reducedMotion && !saveData && !videoFailed

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
