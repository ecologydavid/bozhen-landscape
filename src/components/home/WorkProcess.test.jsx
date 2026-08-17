import { render, screen } from '@testing-library/react'
import WorkProcess from './WorkProcess'

test('keeps the genuine five-step sequence as an ordered path', () => {
  const { container } = render(<WorkProcess />)
  expect(container.querySelector('ol.process-path')).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(5)
  expect(screen.getByText('01')).toBeInTheDocument()
  expect(screen.getByText('05')).toBeInTheDocument()
})
