import { render, screen } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import LeafIcon from './LeafIcon'

afterEach(() => {
  vi.restoreAllMocks()
})

test.each(['leaf', 'sprout', 'water', 'care', 'arrowLeaf'])(
  'renders the %s outlined icon as decorative by default',
  (name) => {
    const { container } = render(<LeafIcon name={name} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  },
)

test('keeps decorative plant icons out of the accessibility tree', () => {
  const { container } = render(<LeafIcon name="sprout" />)
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
})

test('identifies the approved sprout glyph for visual consistency', () => {
  const { container } = render(<LeafIcon name="sprout" />)
  expect(container.querySelector('svg')).toHaveAttribute('data-icon', 'sprout')
  expect(container.querySelectorAll('path')).toHaveLength(4)
})

test('exposes a named icon when the icon carries meaning by itself', () => {
  render(<LeafIcon name="care" label="植栽養護" />)
  expect(screen.getByRole('img', { name: '植栽養護' })).toBeInTheDocument()
})

test('rejects unsupported icon names', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<LeafIcon name="unknown" />)).toThrow('Unknown leaf icon: unknown')
})
