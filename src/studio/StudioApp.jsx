import { Navigate, Route, Routes } from 'react-router-dom'
import RequireStudioAdmin from './auth/RequireStudioAdmin'
import StudioShell from './components/StudioShell'
import StudioLoginPage from './pages/StudioLoginPage'

function StudioWorkspace() {
  return <h1>內容工作室</h1>
}

export default function StudioApp() {
  return (
    <Routes>
      <Route path="/studio/login" element={<StudioLoginPage />} />
      <Route element={<RequireStudioAdmin />}>
        <Route path="/studio" element={<StudioShell />}>
          <Route index element={<StudioWorkspace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/studio" replace />} />
    </Routes>
  )
}
