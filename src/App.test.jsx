import { render, screen, waitFor } from '@testing-library/react'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import App from './App'

const { studioRootModuleLoad, studioRootRender } = vi.hoisted(() => ({
  studioRootModuleLoad: vi.fn(),
  studioRootRender: vi.fn(),
}))

vi.mock('./studio/StudioRoot', () => {
  studioRootModuleLoad()
  return {
    default: () => {
      studioRootRender()
      return <h1>內容工作室測試替身</h1>
    },
  }
})

beforeEach(() => {
  studioRootModuleLoad.mockClear()
  studioRootRender.mockClear()
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

test('keeps a similar non-Studio prefix in the public 404 app', () => {
  render(
    <MemoryRouter initialEntries={['/studio-old']}>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getByRole('navigation', { name: '主要導覽' })).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: '這條路還沒有風景' }),
  ).toBeInTheDocument()
  expect(studioRootModuleLoad).not.toHaveBeenCalled()
  expect(studioRootRender).not.toHaveBeenCalled()
})

test('marks the Studio lazy-loading fallback as an accessible status view', () => {
  render(
    <MemoryRouter initialEntries={['/studio']}>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getByRole('main')).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('正在載入內容工作室…')
})

test('keeps the public navigation out of Studio routes', async () => {
  render(
    <MemoryRouter initialEntries={['/studio']}>
      <App />
    </MemoryRouter>,
  )

  expect(
    await screen.findByRole('heading', { name: '內容工作室測試替身' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: '主要導覽' })).not.toBeInTheDocument()
})
