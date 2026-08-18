import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToHash() {
  const { hash, pathname, key } = useLocation()
  const initialLocationKeyRef = useRef(key)

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ behavior: 'instant', left: 0, top: 0 })
      if (initialLocationKeyRef.current !== key) {
        const main = document.querySelector('main')
        if (main) {
          main.setAttribute('tabindex', '-1')
          main.focus({ preventScroll: true })
        }
      }
      return
    }

    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (target) {
      const prefersReducedMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
      if (initialLocationKeyRef.current !== key) {
        target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
      }
    }
  }, [hash, pathname, key])

  return null
}
