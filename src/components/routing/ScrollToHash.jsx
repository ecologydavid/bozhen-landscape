import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToHash({ focusBlocked = false }) {
  const { hash, pathname, key } = useLocation()
  const previousLocationRef = useRef({ hash, key, pathname })
  const pendingNavigationFocusRef = useRef(false)
  const firstRunRef = useRef(true)

  useEffect(() => {
    const previousLocation = previousLocationRef.current
    const hasNavigated = previousLocation.key !== key
      || previousLocation.pathname !== pathname
      || previousLocation.hash !== hash
    const shouldScroll = firstRunRef.current || hasNavigated
    firstRunRef.current = false
    previousLocationRef.current = { hash, key, pathname }
    if (hasNavigated) pendingNavigationFocusRef.current = true
    const shouldMoveFocus = pendingNavigationFocusRef.current && !focusBlocked

    if (!hash) {
      if (shouldScroll) {
        window.scrollTo({ behavior: 'instant', left: 0, top: 0 })
      }
      if (shouldMoveFocus) {
        const main = document.querySelector('main')
        if (main) {
          main.setAttribute('tabindex', '-1')
          main.focus({ preventScroll: true })
          pendingNavigationFocusRef.current = false
        }
      }
      return
    }

    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (target) {
      const prefersReducedMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (shouldScroll) {
        target.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      }
      if (shouldMoveFocus) {
        target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
        pendingNavigationFocusRef.current = false
      }
    }
  }, [focusBlocked, hash, pathname, key])

  return null
}
