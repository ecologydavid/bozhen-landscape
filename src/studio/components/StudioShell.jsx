import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useStudioAuth } from '../auth/StudioAuthProvider'

const navigationItems = [
  { label: '案場素材', to: '/studio/projects' },
  { label: '待審核', to: '/studio/review' },
  { label: '已核准', to: '/studio/approved' },
  { label: '設定', to: '/studio/settings' },
]

export default function StudioShell() {
  const { user, signOut } = useStudioAuth()
  const [signOutError, setSignOutError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setSignOutError('')
    setIsSigningOut(true)

    try {
      await signOut()
    } catch {
      setSignOutError('登出失敗，請再試一次。')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="studio-shell">
      <a className="studio-skip-link" href="#studio-main-content">
        跳至主要內容
      </a>
      <aside className="studio-sidebar">
        <div className="studio-brand">曜聖｜內容工作室</div>
        <nav className="studio-nav" aria-label="內容工作室導覽">
          {navigationItems.map(({ label, to }) => (
            <NavLink
              key={to}
              className={({ isActive }) =>
                `studio-nav-link${isActive ? ' active' : ''}`
              }
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="studio-account">
          <span className="studio-account-label">登入帳號</span>
          <span className="studio-account-email">{user?.email}</span>
          {signOutError ? (
            <p className="studio-sign-out-error" role="alert">
              {signOutError}
            </p>
          ) : null}
          <button
            className="studio-sign-out-button"
            type="button"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            {isSigningOut ? '登出中…' : '登出'}
          </button>
        </div>
      </aside>
      <main className="studio-main" id="studio-main-content" tabIndex="-1">
        <Outlet />
      </main>
    </div>
  )
}
