import { useCallback, useState, useSyncExternalStore } from 'react'
import BrandImage from '../ui/BrandImage'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
const mobileViewportQuery = '(max-width: 768px)'
const getStaticPreference = () => false
const getClientReady = () => true
const subscribeToNothing = () => () => {}

function getMediaPreference(query) {
  return typeof window !== 'undefined' && window.matchMedia?.(query).matches === true
}

function useMediaPreference(query) {
  const subscribe = useCallback((onStoreChange) => {
    if (typeof window === 'undefined') return subscribeToNothing()

    const mediaQuery = window.matchMedia?.(query)
    if (!mediaQuery?.addEventListener) return subscribeToNothing()

    mediaQuery.addEventListener('change', onStoreChange)
    return () => mediaQuery.removeEventListener?.('change', onStoreChange)
  }, [query])
  const getSnapshot = useCallback(() => getMediaPreference(query), [query])

  return useSyncExternalStore(subscribe, getSnapshot, getStaticPreference)
}

function getDataSavingPreference() {
  return typeof navigator !== 'undefined' && navigator.connection?.saveData === true
}

function subscribeToDataSavingPreference(onStoreChange) {
  if (typeof navigator === 'undefined') return subscribeToNothing()

  const connection = navigator.connection
  if (!connection?.addEventListener) return subscribeToNothing()

  connection.addEventListener('change', onStoreChange)
  return () => connection.removeEventListener?.('change', onStoreChange)
}

function useDataSavingPreference() {
  return useSyncExternalStore(
    subscribeToDataSavingPreference,
    getDataSavingPreference,
    getStaticPreference,
  )
}

function useClientReady() {
  return useSyncExternalStore(subscribeToNothing, getClientReady, getStaticPreference)
}

function HeroVideo({ videoSrc, onError }) {
  const [videoReady, setVideoReady] = useState(false)

  return (
    <video
      data-testid="hero-video"
      className={`hero__video${videoReady ? ' is-ready' : ''}`}
      src={videoSrc}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      onCanPlay={() => setVideoReady(true)}
      onError={onError}
    />
  )
}

function selectVideoSource(videoSrc, mobileViewport) {
  if (typeof videoSrc === 'string') return videoSrc
  if (!videoSrc) return ''
  return mobileViewport ? videoSrc.mobile : videoSrc.desktop
}

export default function HeroMedia({ image, alt, videoSrc }) {
  const reducedMotion = useMediaPreference(reducedMotionQuery)
  const mobileViewport = useMediaPreference(mobileViewportQuery)
  const saveData = useDataSavingPreference()
  const clientReady = useClientReady()
  const [videoFailed, setVideoFailed] = useState(false)
  const selectedVideoSrc = selectVideoSource(videoSrc, mobileViewport)
  const shouldPlayVideo = clientReady
    && Boolean(selectedVideoSrc)
    && !reducedMotion
    && !saveData
    && !videoFailed

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
        <HeroVideo key={selectedVideoSrc} videoSrc={selectedVideoSrc} onError={() => setVideoFailed(true)} />
      ) : null}
      <div className="hero__shade" aria-hidden="true" />
      <span className="hero__sun" aria-hidden="true" />
    </div>
  )
}
