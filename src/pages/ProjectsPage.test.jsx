import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProjectsPage from './ProjectsPage'

test('filters projects without navigating away', async () => {
  render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>,
  )

  const filter = screen.getByRole('button', { name: '假山水景' })
  await userEvent.click(filter)

  expect(filter).toHaveAttribute('aria-pressed', 'true')
  expect(
    screen.getByRole('link', { name: '查看案例：疊石・山澗水景' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: '查看案例：老水池再生計畫' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: '查看案例：苔庭・靜水之間' }),
  ).not.toBeInTheDocument()
})
