import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProjectDetailPage from './ProjectDetailPage'

test.each([
  ['/projects/moss-courtyard', '苔庭・靜水之間'],
  ['/projects/not-a-project', '找不到這個案例'],
])('renders %s correctly', (path, heading) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
})
