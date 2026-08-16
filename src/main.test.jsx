import { HashRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'

const { renderRoot } = vi.hoisted(() => ({
  renderRoot: vi.fn(),
}))

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: renderRoot })),
}))

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'
  renderRoot.mockClear()
  vi.resetModules()
})

test('uses hash routing so project pages survive GitHub Pages refreshes', async () => {
  await import('./main')

  const renderedTree = renderRoot.mock.calls[0][0]

  expect(renderedTree.props.children.type).toBe(HashRouter)
})
