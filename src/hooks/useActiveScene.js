import { useEffect, useState } from 'react'

const intersectionThresholds = [0.2, 0.4, 0.6, 0.8]

function getViewportIntersectionRatio(node) {
  const rect = node.getBoundingClientRect()
  const width = rect.width || rect.right - rect.left
  const height = rect.height || rect.bottom - rect.top
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight

  if (width <= 0 || height <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return null
  }

  const visibleWidth = Math.max(
    0,
    Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0),
  )
  const visibleHeight = Math.max(
    0,
    Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0),
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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!ratios.has(entry.target)) return

          ratios.set(
            entry.target,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          )
        })
        updateActiveScene()
      },
      {
        rootMargin: '-18% 0px -38% 0px',
        threshold: intersectionThresholds,
      },
    )

    nodes.forEach((node) => observer.observe(node))

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

    window.addEventListener('scroll', scheduleRefinement, { passive: true })
    window.addEventListener('resize', scheduleRefinement)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', scheduleRefinement)
      window.removeEventListener('resize', scheduleRefinement)

      if (frameId !== null) {
        if (window.cancelAnimationFrame) window.cancelAnimationFrame(frameId)
        else window.clearTimeout(frameId)
      }
    }
  }, [sceneKey])

  return activeScene
}
