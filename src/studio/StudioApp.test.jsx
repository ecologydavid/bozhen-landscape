import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import StudioApp from './StudioApp'

vi.mock('./auth/StudioAuthProvider', () => ({ useStudioAuth: vi.fn() }))
vi.mock('./api/projects', () => ({
  ProjectIdCollisionError: class ProjectIdCollisionError extends Error {},
  createProject: vi.fn(),
  getCurrentFacts: vi.fn(),
  getProject: vi.fn(),
  listProjects: vi.fn(),
  saveFactVersion: vi.fn(),
  updateProject: vi.fn(),
}))
vi.mock('./lib/supabase', () => ({ supabase: { source: 'test' } }))

import { useStudioAuth } from './auth/StudioAuthProvider'
import { listProjects } from './api/projects'

beforeEach(() => {
  vi.resetAllMocks()
  listProjects.mockResolvedValue([])
})

test('shows login to an anonymous visitor', () => {
  useStudioAuth.mockReturnValue({ status: 'anonymous', signIn: vi.fn() })

  render(
    <MemoryRouter initialEntries={['/studio']}>
      <StudioApp />
    </MemoryRouter>,
  )

  expect(
    screen.getByRole('heading', { name: '內容工作室登入' }),
  ).toBeInTheDocument()
})

test('shows workspace only to the admin', () => {
  useStudioAuth.mockReturnValue({
    status: 'admin',
    user: { email: 'admin@example.com' },
  })

  render(
    <MemoryRouter initialEntries={['/studio']}>
      <StudioApp />
    </MemoryRouter>,
  )

  expect(
    screen.getByRole('heading', { name: '內容工作室' }),
  ).toBeInTheDocument()
  expect(screen.getAllByRole('main')).toHaveLength(1)
})

test('routes an admin to the project list', async () => {
  useStudioAuth.mockReturnValue({
    status: 'admin',
    user: { email: 'admin@example.com' },
  })

  render(
    <MemoryRouter initialEntries={['/studio/projects']}>
      <StudioApp />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: '案場素材' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '新增案場' })).toHaveAttribute(
    'href',
    '/studio/projects/new',
  )
})

test('routes an admin to the new project editor', () => {
  useStudioAuth.mockReturnValue({
    status: 'admin',
    user: { email: 'admin@example.com' },
  })

  render(
    <MemoryRouter initialEntries={['/studio/projects/new']}>
      <StudioApp />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: '新增案場' })).toBeInTheDocument()
  expect(screen.getByLabelText('內部名稱')).toBeInTheDocument()
})

test('shows a permission message to an authenticated non-admin', () => {
  useStudioAuth.mockReturnValue({ status: 'forbidden', signOut: vi.fn() })

  render(
    <MemoryRouter initialEntries={['/studio']}>
      <StudioApp />
    </MemoryRouter>,
  )

  expect(screen.getByRole('main')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(
    '此帳號沒有內容工作室權限。',
  )
  expect(screen.getByRole('button', { name: '登出並切換帳號' })).toBeInTheDocument()
})

test('signs out a forbidden account once and returns to the Studio login', async () => {
  const user = userEvent.setup()
  let resolveSignOut
  const signOut = vi.fn().mockReturnValue(new Promise((resolve) => {
    resolveSignOut = resolve
  }))
  let authState = { status: 'forbidden', signOut }
  useStudioAuth.mockImplementation(() => authState)
  const route = () => (
    <MemoryRouter initialEntries={['/studio']}>
      <StudioApp />
    </MemoryRouter>
  )
  const { rerender } = render(route())

  const button = screen.getByRole('button', { name: '登出並切換帳號' })
  await user.click(button)
  await user.click(button)
  expect(signOut).toHaveBeenCalledOnce()
  expect(button).toBeDisabled()
  expect(button).toHaveTextContent('登出中…')

  await act(async () => resolveSignOut())
  authState = { status: 'anonymous', signIn: vi.fn() }
  rerender(route())

  expect(await screen.findByRole('heading', { name: '內容工作室登入' })).toBeInTheDocument()
})

test('keeps a useful retry control when forbidden-account sign out fails', async () => {
  const user = userEvent.setup()
  const signOut = vi.fn().mockRejectedValue(new Error('session token details'))
  useStudioAuth.mockReturnValue({ status: 'forbidden', signOut })

  render(
    <MemoryRouter initialEntries={['/studio']}>
      <StudioApp />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: '登出並切換帳號' }))

  expect(signOut).toHaveBeenCalledOnce()
  expect(await screen.findByText('無法登出，請再試一次。')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '登出並切換帳號' })).toBeEnabled()
  expect(screen.queryByText(/session token details/)).not.toBeInTheDocument()
})

test('marks the loading guard as an accessible status view', () => {
  useStudioAuth.mockReturnValue({ status: 'loading' })

  render(
    <MemoryRouter initialEntries={['/studio']}>
      <StudioApp />
    </MemoryRouter>,
  )

  expect(screen.getByRole('main')).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent(
    '正在確認內容工作室權限…',
  )
})

test('marks an auth failure as an accessible alert view', () => {
  useStudioAuth.mockReturnValue({ status: 'error' })

  render(
    <MemoryRouter initialEntries={['/studio']}>
      <StudioApp />
    </MemoryRouter>,
  )

  expect(screen.getByRole('main')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(
    '無法確認內容工作室權限，請稍後再試。',
  )
})

test('keeps the workspace closed for an unknown auth status', () => {
  useStudioAuth.mockReturnValue({ status: 'unexpected' })

  render(
    <MemoryRouter initialEntries={['/studio']}>
      <StudioApp />
    </MemoryRouter>,
  )

  expect(
    screen.queryByRole('heading', { name: '內容工作室' }),
  ).not.toBeInTheDocument()
})

test('shows the exact login error without exposing the password', async () => {
  const user = userEvent.setup()
  const signIn = vi.fn().mockRejectedValue(new Error('invalid password: secret-value'))
  useStudioAuth.mockReturnValue({ status: 'anonymous', signIn })

  render(
    <MemoryRouter initialEntries={['/studio/login']}>
      <StudioApp />
    </MemoryRouter>,
  )

  await user.type(screen.getByLabelText('電子郵件'), 'admin@example.com')
  await user.type(screen.getByLabelText('密碼'), 'secret-value')
  await user.click(screen.getByRole('button', { name: '登入' }))

  expect(signIn).toHaveBeenCalledWith('admin@example.com', 'secret-value')
  expect(await screen.findByText('登入失敗，請確認帳號與密碼。')).toBeInTheDocument()
  expect(screen.queryByText(/secret-value/)).not.toBeInTheDocument()
})

test('disables login submission while authentication is pending', async () => {
  const user = userEvent.setup()
  let resolveSignIn
  const signIn = vi.fn().mockReturnValue(
    new Promise((resolve) => {
      resolveSignIn = resolve
    }),
  )
  useStudioAuth.mockReturnValue({ status: 'anonymous', signIn })

  render(
    <MemoryRouter initialEntries={['/studio/login']}>
      <StudioApp />
    </MemoryRouter>,
  )

  await user.type(screen.getByLabelText('電子郵件'), 'admin@example.com')
  await user.type(screen.getByLabelText('密碼'), 'password')
  const submit = screen.getByRole('button', { name: '登入' })
  await user.click(submit)

  expect(submit).toBeDisabled()
  resolveSignIn()
})

test('leaves the login route for the workspace after authentication succeeds', async () => {
  const user = userEvent.setup()
  const signIn = vi.fn().mockResolvedValue({})
  let authState = { status: 'anonymous', signIn }
  useStudioAuth.mockImplementation(() => authState)
  const renderRoute = () => (
    <MemoryRouter initialEntries={['/studio/login']}>
      <StudioApp />
    </MemoryRouter>
  )
  const { rerender } = render(renderRoute())

  await user.type(screen.getByLabelText('電子郵件'), 'admin@example.com')
  await user.type(screen.getByLabelText('密碼'), 'password')
  await user.click(screen.getByRole('button', { name: '登入' }))
  expect(signIn).toHaveBeenCalledWith('admin@example.com', 'password')

  authState = {
    status: 'admin',
    user: { email: 'admin@example.com' },
    signIn,
  }
  rerender(renderRoute())

  expect(
    await screen.findByRole('heading', { name: '內容工作室' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: '內容工作室登入' }),
  ).not.toBeInTheDocument()
})

test('leaves the login route for the denial guard when the user is not an admin', async () => {
  let authState = { status: 'anonymous', signIn: vi.fn() }
  useStudioAuth.mockImplementation(() => authState)
  const renderRoute = () => (
    <MemoryRouter initialEntries={['/studio/login']}>
      <StudioApp />
    </MemoryRouter>
  )
  const { rerender } = render(renderRoute())

  authState = { status: 'forbidden' }
  rerender(renderRoute())

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '此帳號沒有內容工作室權限。',
  )
  expect(
    screen.queryByRole('heading', { name: '內容工作室登入' }),
  ).not.toBeInTheDocument()
})
