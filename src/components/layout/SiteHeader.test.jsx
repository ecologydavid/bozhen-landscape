import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SiteHeader from './SiteHeader'

test('opens the mobile navigation and exposes site links', async () => {
  render(
    <MemoryRouter>
      <SiteHeader />
    </MemoryRouter>,
  )

  await userEvent.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).toHaveClass(
    'is-open',
  )
  expect(screen.getByRole('link', { name: '案例作品' })).toHaveAttribute(
    'href',
    '/projects',
  )
})
