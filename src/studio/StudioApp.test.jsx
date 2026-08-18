import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import StudioApp from './StudioApp'

vi.mock('./auth/StudioAuthProvider', () => ({ useStudioAuth: vi.fn() }))

import { useStudioAuth } from './auth/StudioAuthProvider'

beforeEach(() => {
  vi.clearAllMocks()
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
})

test('shows a permission message to an authenticated non-admin', () => {
  useStudioAuth.mockReturnValue({ status: 'forbidden' })

  render(
    <MemoryRouter initialEntries={['/studio']}>
      <StudioApp />
    </MemoryRouter>,
  )

  expect(screen.getByText('此帳號沒有內容工作室權限。')).toBeInTheDocument()
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
