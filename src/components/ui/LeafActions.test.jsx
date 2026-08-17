import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeafActions from './LeafActions'

test('renders direct project and LINE actions', () => {
  render(
    <MemoryRouter>
      <LeafActions
        projectsHref="/projects"
        lineHref="https://line.me/ti/p/~0921047049"
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: '瀏覽庭園作品' })).toHaveAttribute(
    'href',
    '/projects',
  )
  expect(screen.getByRole('link', { name: 'LINE 諮詢' })).toHaveAttribute(
    'href',
    'https://line.me/ti/p/~0921047049',
  )
})
