import { Navigate, Outlet } from 'react-router-dom'
import { useStudioAuth } from './StudioAuthProvider'

export default function RequireStudioAdmin() {
  const { status } = useStudioAuth()

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
