import { useEffect, useRef, useState } from 'react'

const shouldRevealImmediately = () =>
  typeof IntersectionObserver === 'undefined' ||
  (typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches)

export function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(shouldRevealImmediately)

  useEffect(() => {
    if (visible) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.14 },
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [visible])

  return [ref, visible]
}
