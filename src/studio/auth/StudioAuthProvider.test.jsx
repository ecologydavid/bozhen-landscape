import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'
import StudioAuthProvider, { useStudioAuth } from './StudioAuthProvider'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  unsubscribe: vi.fn(),
  authStateChangeCallback: null,
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}))

function AuthProbe() {
  const { signIn, signOut, status, user } = useStudioAuth()

  return (
    <div>
      <p>{status}</p>
      <p>{user?.email}</p>
      <button type="button" onClick={() => signIn('admin@example.com', 'password')}>
        sign in
      </button>
      <button type="button" onClick={() => signOut()}>
        sign out
      </button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.onAuthStateChange.mockImplementation((callback) => {
    mocks.authStateChangeCallback = callback
    return {
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    }
  })
})

test('marks a visitor without a session as anonymous and unsubscribes on cleanup', async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })

  const { unmount } = render(
    <StudioAuthProvider>
      <AuthProbe />
    </StudioAuthProvider>,
  )

  expect(await screen.findByText('anonymous')).toBeInTheDocument()
  unmount()
  expect(mocks.unsubscribe).toHaveBeenCalledOnce()
})

test('marks a listed studio administrator as admin', async () => {
  const user = { id: 'user-1', email: 'admin@example.com' }
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { user_id: user.id },
    error: null,
  })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })
  mocks.from.mockReturnValue({ select })
  mocks.getSession.mockResolvedValue({ data: { session: { user } }, error: null })

  render(
    <StudioAuthProvider>
      <AuthProbe />
    </StudioAuthProvider>,
  )

  expect(await screen.findByText('admin')).toBeInTheDocument()
  expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  expect(mocks.from).toHaveBeenCalledWith('studio_admins')
  expect(select).toHaveBeenCalledWith('user_id')
  expect(eq).toHaveBeenCalledWith('user_id', user.id)
})

test('marks an authenticated user missing from studio administrators as forbidden', async () => {
  const user = { id: 'user-2', email: 'viewer@example.com' }
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  mocks.from.mockReturnValue({
    select: vi.fn().mockReturnValue({ eq }),
  })
  mocks.getSession.mockResolvedValue({ data: { session: { user } }, error: null })

  render(
    <StudioAuthProvider>
      <AuthProbe />
    </StudioAuthProvider>,
  )

  expect(await screen.findByText('forbidden')).toBeInTheDocument()
})

test('reports an administrator lookup failure as an auth error', async () => {
  const user = { id: 'user-3', email: 'admin@example.com' }
  const maybeSingle = vi.fn().mockResolvedValue({
    data: null,
    error: new Error('database unavailable'),
  })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  mocks.from.mockReturnValue({
    select: vi.fn().mockReturnValue({ eq }),
  })
  mocks.getSession.mockResolvedValue({ data: { session: { user } }, error: null })

  render(
    <StudioAuthProvider>
      <AuthProbe />
    </StudioAuthProvider>,
  )

  expect(await screen.findByText('error')).toBeInTheDocument()
})

test('exposes password sign-in and sign-out actions', async () => {
  const user = userEvent.setup()
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null })
  mocks.signOut.mockResolvedValue({ error: null })

  render(
    <StudioAuthProvider>
      <AuthProbe />
    </StudioAuthProvider>,
  )

  await screen.findByText('anonymous')
  await user.click(screen.getByRole('button', { name: 'sign in' }))
  await user.click(screen.getByRole('button', { name: 'sign out' }))

  expect(mocks.signInWithPassword).toHaveBeenCalledWith({
    email: 'admin@example.com',
    password: 'password',
  })
  expect(mocks.signOut).toHaveBeenCalledOnce()
})

test('ignores a pending session lookup after unmount', async () => {
  let resolveSession
  mocks.getSession.mockReturnValue(
    new Promise((resolve) => {
      resolveSession = resolve
    }),
  )

  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { unmount } = render(
    <StudioAuthProvider>
      <AuthProbe />
    </StudioAuthProvider>,
  )

  unmount()
  resolveSession({ data: { session: null }, error: null })
  await waitFor(() => expect(mocks.unsubscribe).toHaveBeenCalledOnce())
  expect(consoleError).not.toHaveBeenCalled()
  consoleError.mockRestore()
})

test('a newer auth event supersedes an older getSession result', async () => {
  let resolveSession
  mocks.getSession.mockReturnValue(
    new Promise((resolve) => {
      resolveSession = resolve
    }),
  )
  const currentUser = { id: 'user-current', email: 'current@example.com' }
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { user_id: currentUser.id },
    error: null,
  })
  mocks.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle }),
    }),
  })

  render(
    <StudioAuthProvider>
      <AuthProbe />
    </StudioAuthProvider>,
  )

  await act(async () => {
    mocks.authStateChangeCallback('SIGNED_IN', { user: currentUser })
  })
  expect(await screen.findByText('admin')).toBeInTheDocument()

  await act(async () => {
    resolveSession({ data: { session: null }, error: null })
  })
  expect(screen.getByText('admin')).toBeInTheDocument()
  expect(screen.getByText('current@example.com')).toBeInTheDocument()
})

test('a late admin lookup cannot override a subsequent signed-out event', async () => {
  let resolveLookup
  const sessionUser = { id: 'user-old', email: 'old@example.com' }
  const maybeSingle = vi.fn().mockReturnValue(
    new Promise((resolve) => {
      resolveLookup = resolve
    }),
  )
  mocks.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle }),
    }),
  })
  mocks.getSession.mockResolvedValue({
    data: { session: { user: sessionUser } },
    error: null,
  })

  render(
    <StudioAuthProvider>
      <AuthProbe />
    </StudioAuthProvider>,
  )

  await waitFor(() => expect(maybeSingle).toHaveBeenCalledOnce())
  await act(async () => {
    mocks.authStateChangeCallback('SIGNED_OUT', null)
  })
  expect(screen.getByText('anonymous')).toBeInTheDocument()

  await act(async () => {
    resolveLookup({ data: { user_id: sessionUser.id }, error: null })
  })
  expect(screen.getByText('anonymous')).toBeInTheDocument()
  expect(screen.queryByText('old@example.com')).not.toBeInTheDocument()
})
