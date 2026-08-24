import { StrictMode } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter, MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import App from './App'

function HistoryNavigation() {
  const navigate = useNavigate()

  return (
    <div>
      <button type="button" onClick={() => navigate('/#contact')}>
        Go contact
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Go back
      </button>
    </div>
  )
}

beforeEach(() => {
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  })
})

test('renders the official brand and primary direct contact action', () => {
  const { container } = render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getAllByText('曜聖景觀有限公司').length).toBeGreaterThan(0)
  expect(screen.getAllByText('YAO SEI LIMITED COMPANY')).toHaveLength(2)
  expect(container.querySelector('.site-footer__english-name')).toHaveTextContent(
    'YAO SEI LIMITED COMPANY',
  )
  expect(screen.queryByText('統一編號 00111874')).not.toBeInTheDocument()
  const contactPanel = container.querySelector('.contact-panel')
  expect(within(contactPanel).getByText('統一編號')).toBeInTheDocument()
  expect(within(contactPanel).getByText('00111874')).toBeInTheDocument()
  expect(
    screen.getAllByRole('link', { name: /a74964163285@gmail.com/ }).length,
  ).toBeGreaterThan(0)
  expect(
    screen.getAllByRole('link', {
      name: 'Email a74964163285@gmail.com',
    }),
  ).toHaveLength(2)
  expect(container.querySelectorAll('.contact-panel__actions .leaf-icon')).toHaveLength(3)
  expect(container.querySelector('.brand-story__sun')).toBeInTheDocument()
  expect(container.querySelector('.brand-story__seal')).not.toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /LINE 聯絡/ }).length).toBeGreaterThan(0)
  expect(screen.queryByText('取得專屬報價')).not.toBeInTheDocument()
})

test('uses hash-safe links for GitHub Pages project routes', () => {
  window.location.hash = '#/'
  const { container } = render(
    <HashRouter>
      <App />
    </HashRouter>,
  )

  expect(container.querySelectorAll('a[href^="/"]')).toHaveLength(0)
})

test('keeps homepage section links inside the hash router', () => {
  window.location.hash = '#/'
  const { container } = render(
    <HashRouter>
      <App />
    </HashRouter>,
  )

  expect(
    container.querySelectorAll('a[href="#contact"], a[href="#services"]'),
  ).toHaveLength(0)
})

test('scrolls to a requested homepage section after route navigation', async () => {
  const scrollIntoView = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })

  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/#contact']}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )

  await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
  const contact = document.getElementById('contact')
  expect(contact).not.toHaveAttribute('tabindex', '-1')
  expect(contact).not.toHaveFocus()
  delete HTMLElement.prototype.scrollIntoView
})

test('resets the scroll position when opening a route without a section', async () => {
  const scrollTo = vi.fn()
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: scrollTo,
  })

  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/projects']}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )

  await waitFor(() =>
    expect(scrollTo).toHaveBeenCalledWith({
      behavior: 'instant',
      left: 0,
      top: 0,
    }),
  )
  expect(screen.getByRole('main')).not.toHaveAttribute('tabindex', '-1')
  expect(screen.getByRole('main')).not.toHaveFocus()
  delete window.scrollTo
})

test('moves focus from a closed navigation link to the next route main content', async () => {
  const user = userEvent.setup()

  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  await user.click(screen.getByRole('link', { name: '作品案例' }))

  await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
  expect(screen.getByRole('main')).toHaveClass('projects-page')
})

test('returns navigation focus to contact for changed and repeated contact hashes', async () => {
  const user = userEvent.setup()
  const scrollIntoView = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })

  render(
    <MemoryRouter initialEntries={['/#services']}>
      <App />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  await user.click(screen.getByRole('link', { name: '聯絡資訊' }))

  await waitFor(() => expect(document.getElementById('contact')).toHaveFocus())
  expect(screen.getByRole('navigation', { name: '主要導覽' })).not.toHaveClass(
    'is-open',
  )

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  await user.click(screen.getByRole('link', { name: '聯絡資訊' }))

  await waitFor(() => expect(document.getElementById('contact')).toHaveFocus())
  expect(screen.getByRole('navigation', { name: '主要導覽' })).not.toHaveClass(
    'is-open',
  )
  expect(scrollIntoView).toHaveBeenCalledTimes(3)
  delete HTMLElement.prototype.scrollIntoView
})

test('uses instant hash scrolling when reduced motion is preferred', async () => {
  const scrollIntoView = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true }),
  })

  render(
    <MemoryRouter initialEntries={['/#services']}>
      <App />
    </MemoryRouter>,
  )

  await waitFor(() =>
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    }),
  )
  expect(document.getElementById('services')).not.toHaveFocus()
  delete HTMLElement.prototype.scrollIntoView
  delete window.matchMedia
})

test('focuses main after POP returns to the initial route key', async () => {
  const user = userEvent.setup()
  const scrollIntoView = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })

  render(
    <MemoryRouter initialEntries={['/projects']}>
      <HistoryNavigation />
      <App />
    </MemoryRouter>,
  )

  expect(screen.getByRole('main')).not.toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Go contact' }))
  await waitFor(() => expect(document.getElementById('contact')).toHaveFocus())

  await user.click(screen.getByRole('button', { name: 'Go back' }))
  await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
  expect(screen.getByRole('main')).toHaveClass('projects-page')
  delete HTMLElement.prototype.scrollIntoView
})

test('makes every surface outside the header inert only while the menu is open', async () => {
  const user = userEvent.setup()
  const { container } = render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )

  const content = container.querySelector('.site-content')
  expect(content).not.toHaveAttribute('inert')
  expect(content).not.toHaveAttribute('aria-hidden')

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(content).toHaveAttribute('inert')
  expect(content).toHaveAttribute('aria-hidden', 'true')
  expect(screen.getByRole('link', { name: '作品案例' })).toHaveFocus()

  await user.keyboard('{Escape}')
  expect(content).not.toHaveAttribute('inert')
  expect(content).not.toHaveAttribute('aria-hidden')
})

test('closes an open menu on POP without returning focus to the stale toggle', async () => {
  const user = userEvent.setup()
  const scrollIntoView = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })

  render(
    <MemoryRouter initialEntries={['/projects']}>
      <HistoryNavigation />
      <App />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: 'Go contact' }))
  await waitFor(() => expect(document.getElementById('contact')).toHaveFocus())
  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(screen.getByRole('link', { name: '作品案例' })).toHaveFocus()

  await user.click(screen.getByRole('button', { name: 'Go back' }))

  await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
  expect(screen.getByRole('navigation', { name: '主要導覽' })).not.toHaveClass('is-open')
  expect(screen.getByRole('button', { name: '開啟選單' })).not.toHaveFocus()
  expect(document.querySelector('.site-content')).not.toHaveAttribute('inert')
  delete HTMLElement.prototype.scrollIntoView
})
