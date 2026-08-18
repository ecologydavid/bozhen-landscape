import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import RequireStudioAdmin from './auth/RequireStudioAdmin'
import StudioLoginPage from './pages/StudioLoginPage'

function StudioShellPlaceholder() {
  return <Outlet />
}

function StudioWorkspace() {
  return (
    <main>
      <h1>內容工作室</h1>
    </main>
  )
}

export default function StudioApp() {
  return (
    <Routes>
      <Route path="/studio/login" element={<StudioLoginPage />} />
      <Route element={<RequireStudioAdmin />}>
        <Route path="/studio" element={<StudioShellPlaceholder />}>
          <Route index element={<StudioWorkspace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/studio" replace />} />
    </Routes>
  )
}
