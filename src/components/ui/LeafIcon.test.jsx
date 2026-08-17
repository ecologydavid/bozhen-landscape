import { render } from '@testing-library/react'
import LeafIcon from './LeafIcon'

test('renders as a decorative icon', () => {
  const { container } = render(<LeafIcon />)
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
})
