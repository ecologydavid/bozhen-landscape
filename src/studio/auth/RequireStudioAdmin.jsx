import { Navigate, Outlet } from 'react-router-dom'
import { useStudioAuth } from './StudioAuthProvider'

export default function RequireStudioAdmin() {
  const { status } = useStudioAuth()

  if (status === 'loading') {
    return <p>正在確認內容工作室權限…</p>
  }

  if (status === 'anonymous') {
    return <Navigate to="/studio/login" replace />
  }

  if (status === 'forbidden') {
    return <p>此帳號沒有內容工作室權限。</p>
  }

  if (status !== 'admin') {
    return <p>無法確認內容工作室權限，請稍後再試。</p>
  }

  return <Outlet />
}
