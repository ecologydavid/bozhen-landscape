import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { navigation } from '../../data/navigation'
import BrandImage from '../ui/BrandImage'
import LeafIcon from '../ui/LeafIcon'
import { trackEvent } from '../../lib/analytics'

export default function SiteHeader({
  brand,
  contact,
  navigationImage,
  navigationImageAlt,
  menuOpen: controlledMenuOpen,
  onMenuOpenChange,
}) {
  const location = useLocation()
  const [uncontrolledMenuOpen, setUncontrolledMenuOpen] = useState(false)
  const menuOpen = controlledMenuOpen ?? uncontrolledMenuOpen
  const [navigationVisualReady, setNavigationVisualReady] = useState(
    Boolean(controlledMenuOpen),
  )
  const [scrolled, setScrolled] = useState(false)
  const toggleRef = useRef(null)
  const firstLinkRef = useRef(null)
  const navRef = useRef(null)
  const returnFocusRef = useRef(false)
  const previousLocationRef = useRef({
    hash: location.hash,
    key: location.key,
    pathname: location.pathname,
  })

  const setMenuOpen = useCallback((nextOpen) => {
    if (nextOpen) setNavigationVisualReady(true)
    if (controlledMenuOpen === undefined) setUncontrolledMenuOpen(nextOpen)
    onMenuOpenChange?.(nextOpen)
  }, [controlledMenuOpen, onMenuOpenChange])

  const closeMenu = useCallback(({ returnFocus = false } = {}) => {
    returnFocusRef.current = returnFocus
    setMenuOpen(false)
  }, [setMenuOpen])

  const toggleMenu = () => {
    trackEvent('navigation_toggle', { state: menuOpen ? 'closed' : 'opened' })
    if (menuOpen) closeMenu({ returnFocus: true })
    else setMenuOpen(true)
  }

  useEffect(() => {
    const previousLocation = previousLocationRef.current
    const locationChanged = previousLocation.key !== location.key
      || previousLocation.pathname !== location.pathname
      || previousLocation.hash !== location.hash
    previousLocationRef.current = {
      hash: location.hash,
      key: location.key,
      pathname: location.pathname,
    }

    if (!locationChanged) return
    returnFocusRef.current = false
    setMenuOpen(false)
  }, [location.hash, location.key, location.pathname, setMenuOpen])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const mobileViewport = window.matchMedia?.('(max-width: 768px)')
    if (!mobileViewport) return undefined

    const handleViewportChange = (event) => {
      if (event.matches) return
      returnFocusRef.current = false
      setMenuOpen(false)
    }

    const addChangeListener = mobileViewport.addEventListener
      ? (listener) => mobileViewport.addEventListener('change', listener)
      : mobileViewport.addListener
        ? (listener) => mobileViewport.addListener(listener)
        : undefined
    const removeChangeListener = mobileViewport.removeEventListener
      ? (listener) => mobileViewport.removeEventListener('change', listener)
      : mobileViewport.removeListener
        ? (listener) => mobileViewport.removeListener(listener)
        : undefined
    if (!addChangeListener || !removeChangeListener) return undefined

    addChangeListener(handleViewportChange)
    return () => {
      removeChangeListener(handleViewportChange)
    }
  }, [setMenuOpen])

  useEffect(() => {
    if (!menuOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeMenu({ returnFocus: true })
        return
      }

      if (event.key !== 'Tab') return

      const focusableLinks = Array.from(
        navRef.current?.querySelectorAll('a[href]') ?? [],
      )
      const firstLink = focusableLinks.at(0)
      const lastLink = focusableLinks.at(-1)
      if (!firstLink || !lastLink) return

      const activeElement = document.activeElement
      if (event.shiftKey && activeElement === firstLink) {
        event.preventDefault()
        lastLink.focus()
      } else if (!event.shiftKey && activeElement === lastLink) {
        event.preventDefault()
        firstLink.focus()
      }
    }

    document.body.classList.add('nav-open')
    window.addEventListener('keydown', handleKeyDown)
    const focusFirstVisibleLink = () => {
      const firstLink = firstLinkRef.current
      if (!firstLink || window.getComputedStyle(firstLink).visibility !== 'visible') {
        focusFrame = window.requestAnimationFrame(focusFirstVisibleLink)
        return
      }
      firstLink.focus()
    }
    let focusFrame
    focusFirstVisibleLink()

    return () => {
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame)
      document.body.classList.remove('nav-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeMenu, menuOpen])

  useEffect(() => {
    if (!menuOpen && returnFocusRef.current) {
      toggleRef.current?.focus()
      returnFocusRef.current = false
    }
  }, [menuOpen])

  const surfaceClass = location.pathname.startsWith('/projects')
    ? 'site-header--on-dark'
    : 'site-header--on-light'

  return (
    <header
      className={`site-header ${surfaceClass}${scrolled ? ' is-scrolled' : ''}`}
    >
      <div className="site-header__inner">
        <Link
          className="brand-mark"
          to="/"
          aria-label={brand.name}
          onClick={closeMenu}
        >
          <img className="brand-mark__logo" src={brand.logoSrc} alt="" />
          <span className="brand-mark__wording">
            <strong>{brand.shortName}</strong>
            <small>{brand.englishName}</small>
          </span>
        </Link>

        <button
          ref={toggleRef}
          className="nav-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? '關閉選單' : '開啟選單'}
          onClick={toggleMenu}
        >
          <span />
          <span />
        </button>

        <button
          className={`nav-backdrop${menuOpen ? ' is-visible' : ''}`}
          type="button"
          aria-label="關閉主要導覽"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => closeMenu({ returnFocus: true })}
        />

        <nav
          ref={navRef}
          id="primary-navigation"
          className={`site-nav${menuOpen ? ' is-open' : ''}`}
          aria-label="主要導覽"
        >
          <div className="site-nav__meta" aria-hidden="true">
            <span>MENU / 網站導覽</span>
            <span>YAO SHENG</span>
          </div>
          <div className="site-nav__index">
            {navigation.map((item, index) => (
              <Link
                key={item.to}
                ref={index === 0 ? firstLinkRef : undefined}
                className="site-nav__item"
                to={item.to}
                aria-label={item.label}
                onClick={() => {
                  trackEvent('navigation_click', { label: item.label, destination: item.to })
                  closeMenu()
                }}
              >
                <span className="site-nav__number">{item.number}</span>
                <span className="site-nav__wording">
                  <strong>{item.label}</strong>
                  <small>{item.english}</small>
                </span>
                <span className="site-nav__arrow">
                  <LeafIcon name="sprout" />
                </span>
              </Link>
            ))}
          </div>
          {navigationVisualReady && navigationImage && navigationImageAlt ? (
            <div className="site-nav__visual">
              <BrandImage
                src={navigationImage}
                alt={`導覽中的${navigationImageAlt}`}
                loading="lazy"
                decoding="async"
                sizes="(max-width: 768px) 72vw, 1px"
              />
              <span>把自然，安放進日常</span>
            </div>
          ) : null}
          <div className="site-nav__contacts">
            <a
              href={contact.lineHref}
              target="_blank"
              rel="noreferrer"
              aria-label="LINE 聯絡"
              onClick={() => {
                trackEvent('contact_click', { method: 'line', location: 'header' })
                closeMenu({ returnFocus: true })
              }}
            >
              <LeafIcon name="sprout" />
              <span>LINE 聯絡</span>
            </a>
            <a
              href={contact.phoneHref}
              aria-label={`撥打 ${contact.mobile}`}
              onClick={() => {
                trackEvent('contact_click', { method: 'phone', location: 'header' })
                closeMenu({ returnFocus: true })
              }}
            >
              <LeafIcon name="sprout" />
              <span>撥打電話</span>
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
