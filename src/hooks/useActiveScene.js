import { useEffect, useState } from 'react'

export function useActiveScene(sceneIds) {
  const [activeScene, setActiveScene] = useState(sceneIds[0])
  const sceneKey = sceneIds.join('|')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined

    const nodes = [...document.querySelectorAll('[data-scene]')]
    const ratios = new Map(nodes.map((node) => [node, 0]))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          ratios.set(
            entry.target,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          ),
        )

        const candidate = [...ratios.entries()].sort(([, a], [, b]) => b - a)[0]

        if (candidate?.[1] > 0 && candidate[0].dataset.scene) {
          setActiveScene(candidate[0].dataset.scene)
        }
      },
      { rootMargin: '-18% 0px -38% 0px', threshold: [0.2, 0.4, 0.6, 0.8] },
    )

    nodes.forEach((node) => observer.observe(node))

    return () => observer.disconnect()
  }, [sceneKey])

  return activeScene
}
