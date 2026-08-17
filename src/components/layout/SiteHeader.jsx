import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandImage from '../ui/BrandImage'
import LeafIcon from '../ui/LeafIcon'

const navigation = [
  { label: '作品案例', english: 'PROJECTS', to: '/projects' },
  { label: '服務內容', english: 'SERVICES', to: '/#services' },
  { label: '關於曜聖', english: 'ABOUT', to: '/#about' },
  { label: '聯絡資訊', english: 'CONTACT', to: '/#contact' },
]

export default function SiteHeader({ brand, contact, menuFeature }) {
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

        <nav
          id="primary-navigation"
          className={`site-nav${menuOpen ? ' is-open' : ''}`}
          aria-label="主要導覽"
        >
          <div className="site-nav__desktop">
            {navigation.slice(0, 3).map((item) => (
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
          </div>

          <div className="site-nav__mobile">
            <div className="site-nav__intro">
              <h2>探索曜聖</h2>
              <span>YAO SEI / MENU</span>
            </div>
            <div className="site-nav__links">
              {navigation.map((item) => (
                <Link key={item.to} to={item.to} onClick={closeMenu}>
                  <LeafIcon />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.english}</small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
            <div className="site-nav__feature">
              <BrandImage src={menuFeature.image} alt={menuFeature.alt} />
              <div>
                <small>{menuFeature.eyebrow}</small>
                <strong>{menuFeature.title}</strong>
              </div>
            </div>
            <div className="site-nav__contact-row">
              <a
                href={contact.lineHref}
                target="_blank"
                rel="noreferrer"
                onClick={closeMenu}
              >
                LINE 聯絡
              </a>
              <a href={contact.phoneHref} onClick={closeMenu}>
                撥打電話
              </a>
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
