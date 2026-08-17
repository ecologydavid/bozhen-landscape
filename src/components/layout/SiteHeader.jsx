import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navigation = [
  { label: '服務項目', to: '/#services' },
  { label: '案例作品', to: '/projects' },
  { label: '關於曜聖', to: '/#about' },
]

export default function SiteHeader({ brand, contact }) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.body.classList.add('nav-open')
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('nav-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)
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
          className="nav-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? '關閉選單' : '開啟選單'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <button
          className={`nav-backdrop${menuOpen ? ' is-visible' : ''}`}
          type="button"
          aria-label="關閉主要導覽"
          tabIndex={menuOpen ? 0 : -1}
          onClick={closeMenu}
        />

        <nav
          id="primary-navigation"
          className={`site-nav${menuOpen ? ' is-open' : ''}`}
          aria-label="主要導覽"
        >
          {navigation.map((item) => (
            <Link key={item.to} to={item.to} onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
          <a
            className="site-nav__contact"
            href={contact.lineHref}
            target="_blank"
            rel="noreferrer"
            aria-label="LINE 聯絡曜聖景觀"
            onClick={closeMenu}
          >
            LINE 聯絡
          </a>
        </nav>
      </div>
    </header>
  )
}
