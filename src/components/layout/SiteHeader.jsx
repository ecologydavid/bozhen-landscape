import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const navigation = [
  { label: '服務項目', href: '/#services' },
  { label: '案例作品', href: '/projects' },
  { label: '關於柏鎮', href: '/#about' },
]

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="site-header__inner">
        <Link className="brand-mark" to="/" onClick={closeMenu}>
          <span className="brand-mark__monogram" aria-hidden="true">
            柏
          </span>
          <span className="brand-mark__name">柏鎮園藝</span>
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
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
          <a className="site-nav__quote" href="/#quote" onClick={closeMenu}>
            取得專屬報價
          </a>
        </nav>
      </div>
    </header>
  )
}
