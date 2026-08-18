import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToHash() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ behavior: 'instant', left: 0, top: 0 })
      const main = document.querySelector('main')
      if (main) {
        main.setAttribute('tabindex', '-1')
        main.focus({ preventScroll: true })
      }
      return
    }

    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
  }, [hash, pathname])

  return null
}
