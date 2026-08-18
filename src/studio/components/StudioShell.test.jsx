import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import StudioShell from './StudioShell'

vi.mock('../auth/StudioAuthProvider', () => ({ useStudioAuth: vi.fn() }))

import { useStudioAuth } from '../auth/StudioAuthProvider'

const links = [
  ['案場素材', '/studio/projects'],
  ['待審核', '/studio/review'],
  ['已核准', '/studio/approved'],
  ['設定', '/studio/settings'],
]

beforeEach(() => {
  vi.clearAllMocks()
  useStudioAuth.mockReturnValue({
    user: { email: 'admin@example.com' },
    signOut: vi.fn().mockResolvedValue(),
  })
})

test('exposes private workspace navigation and account controls', () => {
  render(
    <MemoryRouter>
      <StudioShell />
    </MemoryRouter>,
  )

  expect(
    screen.getByRole('navigation', { name: '內容工作室導覽' }),
  ).toBeInTheDocument()
  links.forEach(([name, href]) => {
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
  })
  expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '跳至主要內容' })).toHaveAttribute(
    'href',
    '#studio-main-content',
  )
})

test('renders the selected workspace route inside the main content', () => {
  render(
    <MemoryRouter initialEntries={['/studio/projects']}>
      <Routes>
        <Route path="/studio" element={<StudioShell />}>
          <Route path="projects" element={<h1>案場清單</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

  expect(screen.getByRole('main')).toHaveAttribute('id', 'studio-main-content')
  expect(screen.getByRole('heading', { name: '案場清單' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '案場素材' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('marks the matching navigation destination as active', () => {
  render(
    <MemoryRouter initialEntries={['/studio/review']}>
      <StudioShell />
    </MemoryRouter>,
  )

  expect(screen.getByRole('link', { name: '待審核' })).toHaveClass('active')
  expect(screen.getByRole('link', { name: '案場素材' })).not.toHaveClass(
    'active',
  )
})

test('signs out the current user', async () => {
  const user = userEvent.setup()
  const signOut = vi.fn().mockResolvedValue()
  useStudioAuth.mockReturnValue({
    user: { email: 'admin@example.com' },
    signOut,
  })

  render(
    <MemoryRouter>
      <StudioShell />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: '登出' }))

  expect(signOut).toHaveBeenCalledOnce()
})

test('shows a retryable alert when sign-out fails', async () => {
  const user = userEvent.setup()
  const signOut = vi
    .fn()
    .mockRejectedValueOnce(new Error('network unavailable'))
    .mockResolvedValueOnce()
  useStudioAuth.mockReturnValue({
    user: { email: 'admin@example.com' },
    signOut,
  })

  render(
    <MemoryRouter>
      <StudioShell />
    </MemoryRouter>,
  )

  const signOutButton = screen.getByRole('button', { name: '登出' })
  await user.click(signOutButton)

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '登出失敗，請再試一次。',
  )

  await user.click(signOutButton)

  expect(signOut).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
