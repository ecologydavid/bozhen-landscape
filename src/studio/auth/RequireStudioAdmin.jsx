import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useStudioAuth } from './StudioAuthProvider'

export default function RequireStudioAdmin() {
  const { status, signOut } = useStudioAuth()
  const [signOutState, setSignOutState] = useState('idle')

  async function handleSignOut() {
    if (signOutState === 'pending') return
    setSignOutState('pending')
    try {
      await signOut()
    } catch {
      setSignOutState('error')
      return
    }
    setSignOutState('idle')
  }

  if (status === 'loading') {
    return (
      <main>
        <p role="status">正在確認內容工作室權限…</p>
      </main>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/studio/login" replace />
  }

  if (status === 'forbidden') {
    return (
      <main>
        <p role="alert">此帳號沒有內容工作室權限。</p>
        {signOutState === 'error' ? <p role="alert">無法登出，請再試一次。</p> : null}
        <button type="button" onClick={handleSignOut} disabled={signOutState === 'pending'}>
          {signOutState === 'pending' ? '登出中…' : '登出並切換帳號'}
        </button>
      </main>
    )
  }

  if (status !== 'admin') {
    return (
      <main>
        <p role="alert">無法確認內容工作室權限，請稍後再試。</p>
      </main>
    )
  }

  return <Outlet />
}
