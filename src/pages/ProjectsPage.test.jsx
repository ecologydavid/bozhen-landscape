import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProjectsPage from './ProjectsPage'

test('filters projects without navigating away', async () => {
  const { container } = render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>,
  )

  expect(container.querySelector('.project-card__index')).not.toBeInTheDocument()

  const filter = screen.getByRole('button', { name: '假山水景' })
  await userEvent.click(filter)

  expect(filter).toHaveAttribute('aria-pressed', 'true')
  expect(
    screen.getByRole('link', { name: '查看案例：南屯私人宅假山水景' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: '查看案例：彰化私人住宅庭園整理' }),
  ).not.toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /查看案例：/ })).toHaveLength(1)
})
