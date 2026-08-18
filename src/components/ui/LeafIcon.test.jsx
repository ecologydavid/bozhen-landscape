import { render, screen } from '@testing-library/react'
import LeafIcon from './LeafIcon'

test('keeps decorative plant icons out of the accessibility tree', () => {
  const { container } = render(<LeafIcon name="sprout" />)
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
})

test('exposes a named icon when the icon carries meaning by itself', () => {
  render(<LeafIcon name="care" label="植栽養護" />)
  expect(screen.getByRole('img', { name: '植栽養護' })).toBeInTheDocument()
})
