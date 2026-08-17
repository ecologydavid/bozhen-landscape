import { render, screen, waitFor } from '@testing-library/react'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  })
})

test('renders the official brand and primary direct contact action', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getAllByText('曜聖景觀有限公司').length).toBeGreaterThan(0)
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
    <MemoryRouter initialEntries={['/#contact']}>
      <App />
    </MemoryRouter>,
  )

  await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
  delete HTMLElement.prototype.scrollIntoView
})

test('resets the scroll position when opening a route without a section', async () => {
  const scrollTo = vi.fn()
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: scrollTo,
  })

  render(
    <MemoryRouter initialEntries={['/projects']}>
      <App />
    </MemoryRouter>,
  )

  await waitFor(() =>
    expect(scrollTo).toHaveBeenCalledWith({
      behavior: 'instant',
      left: 0,
      top: 0,
    }),
  )
  delete window.scrollTo
})
