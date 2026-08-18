import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { navigation } from '../../data/navigation'
import LeafIcon from '../ui/LeafIcon'

export default function SiteHeader({ brand, contact }) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const toggleRef = useRef(null)
  const firstLinkRef = useRef(null)
  const returnFocusRef = useRef(false)

  const closeMenu = ({ returnFocus = false } = {}) => {
    returnFocusRef.current = returnFocus
    setMenuOpen(false)
  }

  const toggleMenu = () => {
    if (menuOpen) closeMenu({ returnFocus: true })
    else setMenuOpen(true)
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu({ returnFocus: true })
    }

    document.body.classList.add('nav-open')
    window.addEventListener('keydown', handleKeyDown)
    firstLinkRef.current?.focus()

    return () => {
      document.body.classList.remove('nav-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

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
          id="primary-navigation"
          className={`site-nav${menuOpen ? ' is-open' : ''}`}
          aria-label="主要導覽"
        >
          <div className="site-nav__meta" aria-hidden="true">
            <span>MENU / 網站導覽</span>
            <span>YAO SEI</span>
          </div>
          <div className="site-nav__index">
            {navigation.map((item, index) => (
              <Link
                key={item.to}
                ref={index === 0 ? firstLinkRef : undefined}
                className="site-nav__item"
                to={item.to}
                aria-label={item.label}
                onClick={closeMenu}
              >
                <span className="site-nav__number">{item.number}</span>
                <span className="site-nav__wording">
                  <strong>{item.label}</strong>
                  <small>{item.english}</small>
                </span>
                <span className="site-nav__arrow">
                  <LeafIcon name="arrowLeaf" />
                </span>
              </Link>
            ))}
          </div>
          <div className="site-nav__contacts">
            <a
              className="site-nav__contact site-nav__contact--line"
              href={contact.lineHref}
              target="_blank"
              rel="noreferrer"
              aria-label="LINE 聯絡"
              onClick={closeMenu}
            >
              <LeafIcon name="sprout" />
              <span>LINE 聯絡</span>
            </a>
            <a
              className="site-nav__contact site-nav__contact--phone"
              href={contact.phoneHref}
              aria-label={`撥打 ${contact.mobile}`}
              onClick={closeMenu}
            >
              <LeafIcon name="leaf" />
              <span>撥打電話</span>
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
