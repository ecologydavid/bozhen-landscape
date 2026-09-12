import { StrictMode } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import { siteContent } from '../../data/siteContent'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function createMobileMediaQuery() {
  const listeners = new Set()
  const mediaQuery = {
    matches: true,
    media: '(max-width: 768px)',
    addEventListener: vi.fn((type, listener) => {
      if (type === 'change') listeners.add(listener)
    }),
    removeEventListener: vi.fn((type, listener) => {
      if (type === 'change') listeners.delete(listener)
    }),
    leaveMobile() {
      mediaQuery.matches = false
      listeners.forEach((listener) => listener({ matches: false }))
    },
  }
  return mediaQuery
}

test('uses the approved sprout glyph without mounting menu visuals or contact actions', async () => {
  const user = userEvent.setup()
  const { container } = render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} />
    </MemoryRouter>,
  )

  expect(container.querySelectorAll('[data-icon="leaf"], [data-icon="arrowLeaf"]')).toHaveLength(0)
  expect(container.querySelectorAll('[data-icon="sprout"]')).toHaveLength(4)
  expect(container.querySelectorAll('.site-nav__item')).toHaveLength(4)
  expect(container.querySelectorAll('.site-nav__item [data-icon="sprout"]')).toHaveLength(4)

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  const navigation = screen.getByRole('navigation', { name: '主要導覽' })
  expect(navigation.querySelector('.site-nav__masthead')).toBeInTheDocument()
  expect(navigation.querySelector('.site-nav__visual')).not.toBeInTheDocument()
  expect(navigation.querySelector('.site-nav__contacts')).not.toBeInTheDocument()
})

test('opens and closes the mobile navigation with every supported control', async () => {
  const user = userEvent.setup()
  const { container } = render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  expect(container.querySelector('.site-header')).toHaveClass(
    'site-header--on-light',
  )

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).toHaveClass(
    'is-open',
  )
  expect(screen.getByText('01')).toBeVisible()
  expect(screen.getByText('PROJECTS')).toBeVisible()
  expect(screen.getByRole('link', { name: '作品案例' })).toHaveAttribute(
    'href',
    '/projects',
  )
  await waitFor(() =>
    expect(screen.getByRole('link', { name: '作品案例' })).toHaveFocus(),
  )
  expect(screen.getByRole('link', { name: '曜聖景觀有限公司' })).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: '主要導覽' }).querySelector('.site-nav__contacts')).not.toBeInTheDocument()
  expect(document.body).toHaveClass('nav-open')

  await user.keyboard('{Escape}')
  expect(document.body).not.toHaveClass('nav-open')
  expect(screen.getByRole('button', { name: '開啟選單' })).toHaveFocus()

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  await user.click(screen.getByRole('button', { name: '關閉選單' }))
  expect(screen.getByRole('button', { name: '開啟選單' })).toHaveFocus()

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  await user.click(screen.getByRole('button', { name: '關閉主要導覽' }))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).not.toHaveClass(
    'is-open',
  )
  expect(document.body).not.toHaveClass('nav-open')
  expect(screen.getByRole('button', { name: '開啟選單' })).toHaveFocus()

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  await user.click(screen.getByRole('link', { name: '作品案例' }))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).not.toHaveClass(
    'is-open',
  )
  expect(document.body).not.toHaveClass('nav-open')
})

test('traps keyboard focus within the open navigation', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  await waitFor(() =>
    expect(screen.getByRole('link', { name: '作品案例' })).toHaveFocus(),
  )

  await user.tab({ shift: true })
  expect(screen.getByRole('link', { name: '聯絡資訊' })).toHaveFocus()

  await user.tab()
  expect(screen.getByRole('link', { name: '作品案例' })).toHaveFocus()
})

test('does not mount contact actions inside the navigation', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  const navigation = screen.getByRole('navigation', { name: '主要導覽' })
  expect(navigation.querySelectorAll('.site-nav__contacts a')).toHaveLength(0)
  expect(navigation.querySelectorAll('.site-nav__visual')).toHaveLength(0)
})

test('keeps the drawer interactive after the header becomes scrolled', async () => {
  const user = userEvent.setup()
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: 25,
  })
  const { container } = render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  window.dispatchEvent(new Event('scroll'))
  await waitFor(() =>
    expect(container.querySelector('.site-header')).toHaveClass('is-scrolled'),
  )
  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).toHaveClass(
    'is-open',
  )
})

function PopHarness({ onMenuOpenChange }) {
  const navigate = useNavigate()
  return (
    <>
      <button type="button" onClick={() => navigate('/projects')}>Forward</button>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
      <SiteHeader
        brand={siteContent.brand}
        contact={siteContent.contact}
        onMenuOpenChange={onMenuOpenChange}
      />
    </>
  )
}

test('reports menu state and clears return focus when location changes', async () => {
  const user = userEvent.setup()
  const onMenuOpenChange = vi.fn()
  render(
    <MemoryRouter initialEntries={['/']}>
      <PopHarness onMenuOpenChange={onMenuOpenChange} />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: 'Forward' }))
  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(onMenuOpenChange).toHaveBeenLastCalledWith(true)

  await user.click(screen.getByRole('button', { name: 'Back' }))

  await waitFor(() => expect(onMenuOpenChange).toHaveBeenLastCalledWith(false))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).not.toHaveClass('is-open')
  expect(screen.getByRole('button', { name: '開啟選單' })).not.toHaveFocus()
})

test('waits for a painted frame before focusing the first navigation link and cancels pending focus', async () => {
  const user = userEvent.setup()
  const frameCallbacks = []
  const requestAnimationFrame = vi.fn((callback) => {
    frameCallbacks.push(callback)
    return 40 + requestAnimationFrame.mock.calls.length
  })
  const cancelAnimationFrame = vi.fn()
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)

  const { unmount } = render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  const toggle = screen.getByRole('button', { name: '開啟選單' })
  const firstLink = screen.getByRole('link', { name: '作品案例' })
  let linkVisibility = 'hidden'
  const nativeGetComputedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => (
    element.matches?.('.site-nav__item')
      ? { visibility: linkVisibility }
      : nativeGetComputedStyle(element)
  ))
  await user.click(toggle)

  expect(requestAnimationFrame).toHaveBeenCalledOnce()
  expect(toggle).toHaveFocus()
  act(() => frameCallbacks.shift()())
  expect(requestAnimationFrame).toHaveBeenCalledTimes(2)
  expect(toggle).toHaveFocus()
  act(() => frameCallbacks.shift()())
  expect(requestAnimationFrame).toHaveBeenCalledTimes(3)
  expect(toggle).toHaveFocus()
  linkVisibility = 'visible'
  act(() => frameCallbacks.shift()())
  expect(requestAnimationFrame).toHaveBeenCalledTimes(3)
  expect(firstLink).toHaveFocus()

  await user.click(screen.getByRole('button', { name: '關閉選單' }))
  linkVisibility = 'hidden'
  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(requestAnimationFrame).toHaveBeenCalledTimes(4)
  unmount()
  expect(cancelAnimationFrame).toHaveBeenCalledWith(44)
  expect(document.body).not.toHaveClass('nav-open')
})

test('closes without returning focus when leaving mobile and cleans the listener in StrictMode', async () => {
  const user = userEvent.setup()
  const mediaQuery = createMobileMediaQuery()
  const matchMedia = vi.fn(() => mediaQuery)
  vi.stubGlobal('matchMedia', matchMedia)

  const { unmount } = render(
    <StrictMode>
      <MemoryRouter>
        <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
      </MemoryRouter>
    </StrictMode>,
  )

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  const firstLink = screen.getByRole('link', { name: '作品案例' })
  await waitFor(() => expect(firstLink).toHaveFocus())

  act(() => mediaQuery.leaveMobile())

  expect(screen.getByRole('navigation', { name: '主要導覽' })).not.toHaveClass('is-open')
  expect(document.body).not.toHaveClass('nav-open')
  expect(screen.getByRole('button', { name: '開啟選單' })).not.toHaveFocus()
  expect(matchMedia).toHaveBeenCalledWith('(max-width: 768px)')
  expect(mediaQuery.addEventListener).toHaveBeenCalledTimes(2)
  expect(mediaQuery.removeEventListener).toHaveBeenCalledTimes(1)

  unmount()
  expect(mediaQuery.removeEventListener).toHaveBeenCalledTimes(2)
})
