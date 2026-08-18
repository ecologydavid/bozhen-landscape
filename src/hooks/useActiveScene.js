import { useEffect, useState } from 'react'

const intersectionThresholds = [0.2, 0.4, 0.6, 0.8]
const minimumRootHeight = 96

function getSceneRootGeometry(viewportHeight) {
  const rootHeight = Math.min(
    viewportHeight,
    Math.max(viewportHeight * 0.44, Math.min(minimumRootHeight, viewportHeight)),
  )
  const rootTop = Math.max(
    0,
    Math.min(viewportHeight - rootHeight, viewportHeight * 0.4 - rootHeight / 2),
  )
  const rootBottom = rootTop + rootHeight
  const topMargin = Math.round(rootTop * 100) / 100
  const bottomMargin = Math.round((viewportHeight - rootBottom) * 100) / 100

  return {
    top: rootTop,
    bottom: rootBottom,
    rootMargin: `-${topMargin}px 0px -${bottomMargin}px 0px`,
  }
}

function getViewportIntersectionRatio(node) {
  const rect = node.getBoundingClientRect()
  const width = rect.width || rect.right - rect.left
  const height = rect.height || rect.bottom - rect.top
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight

  if (width <= 0 || height <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return null
  }

  const root = getSceneRootGeometry(viewportHeight)

  const visibleWidth = Math.max(
    0,
    Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0),
  )
  const visibleHeight = Math.max(
    0,
    Math.min(rect.bottom, root.bottom) - Math.max(rect.top, root.top),
  )

  return (visibleWidth * visibleHeight) / (width * height)
}

export function useActiveScene(sceneIds) {
  const [activeScene, setActiveScene] = useState(sceneIds[0])
  const sceneKey = sceneIds.join('|')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined

    const supportedScenes = new Set(sceneKey ? sceneKey.split('|') : [])
    const nodes = [...document.querySelectorAll('[data-scene]')].filter((node) =>
      supportedScenes.has(node.dataset.scene),
    )
    const ratios = new Map(nodes.map((node) => [node, 0]))
    let frameId = null

    const updateActiveScene = () => {
      const candidate = [...ratios.entries()].sort(([, a], [, b]) => b - a)[0]

      if (candidate?.[1] > 0 && candidate[0].dataset.scene) {
        setActiveScene(candidate[0].dataset.scene)
      }
    }

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (!ratios.has(entry.target)) return

        ratios.set(
          entry.target,
          entry.isIntersecting ? entry.intersectionRatio : 0,
        )
      })
      updateActiveScene()
    }
    const createObserver = (viewportHeight) => {
      const geometry = getSceneRootGeometry(viewportHeight)
      const observer = new IntersectionObserver(
        observerCallback,
        {
          rootMargin: geometry.rootMargin,
          threshold: intersectionThresholds,
        },
      )

      nodes.forEach((node) => observer.observe(node))

      return observer
    }
    let observedViewportHeight =
      window.innerHeight || document.documentElement.clientHeight
    let observer = createObserver(observedViewportHeight)

    const refineRatios = () => {
      frameId = null
      nodes.forEach((node) => {
        const ratio = getViewportIntersectionRatio(node)

        if (ratio !== null) ratios.set(node, ratio)
      })
      updateActiveScene()
    }

    const scheduleRefinement = () => {
      if (frameId !== null) return

      frameId = window.requestAnimationFrame
        ? window.requestAnimationFrame(refineRatios)
        : window.setTimeout(refineRatios, 0)
    }

    const handleResize = () => {
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight

      if (viewportHeight !== observedViewportHeight) {
        observer.disconnect()
        observedViewportHeight = viewportHeight
        observer = createObserver(viewportHeight)
      }

      scheduleRefinement()
    }

    window.addEventListener('scroll', scheduleRefinement, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', scheduleRefinement)
      window.removeEventListener('resize', handleResize)

      if (frameId !== null) {
        if (window.cancelAnimationFrame) window.cancelAnimationFrame(frameId)
        else window.clearTimeout(frameId)
      }
    }
  }, [sceneKey])

  return activeScene
}
