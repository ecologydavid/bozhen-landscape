import { useEffect, useState } from 'react'

const intersectionThresholds = Array.from(
  { length: 101 },
  (_, index) => index / 100,
)

export function useActiveScene(sceneIds) {
  const [activeScene, setActiveScene] = useState(sceneIds[0])
  const sceneKey = sceneIds.join('|')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined

    const supportedScenes = new Set(sceneKey ? sceneKey.split('|') : [])
    const nodes = [...document.querySelectorAll('[data-scene]')].filter((node) =>
      supportedScenes.has(node.dataset.scene),
    )
    const observer = new IntersectionObserver(
      (entries) => {
        const candidate = entries
          .filter(
            (entry) =>
              entry.isIntersecting &&
              entry.intersectionRatio > 0 &&
              supportedScenes.has(entry.target.dataset.scene),
          )
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (candidate?.target.dataset.scene) {
          setActiveScene(candidate.target.dataset.scene)
        }
      },
      {
        rootMargin: '-18% 0px -38% 0px',
        threshold: intersectionThresholds,
      },
    )

    nodes.forEach((node) => observer.observe(node))

    return () => observer.disconnect()
  }, [sceneKey])

  return activeScene
}
