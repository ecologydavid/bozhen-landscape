import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import LeafContactLinks from '../ui/LeafContactLinks'

export default function MobileQuoteBar({ contact }) {
  const { pathname } = useLocation()
  return (
    <MobileQuoteBarContent
      key={pathname}
      contact={contact}
      isHome={pathname === '/'}
    />
  )
}

function MobileQuoteBarContent({ contact, isHome }) {
  const [isHeroVisible, setIsHeroVisible] = useState(() => isHome)
  const isVisible = !isHome || !isHeroVisible

  useEffect(() => {
    if (!isHome) return undefined

    const hero = document.getElementById('home')
    if (!hero || typeof window.IntersectionObserver === 'undefined') return undefined

    const observer = new window.IntersectionObserver(([entry]) => {
      setIsHeroVisible(entry.isIntersecting)
    })
    observer.observe(hero)

    return () => observer.disconnect()
  }, [isHome])

  return (
    <nav
      className={`mobile-contact-bar${isVisible ? ' is-visible' : ''}`}
      aria-label="快速聯絡"
      aria-hidden={!isVisible}
      inert={!isVisible}
    >
      <LeafContactLinks contact={contact} className="leaf-contact-links--mobile" />
    </nav>
  )
}
