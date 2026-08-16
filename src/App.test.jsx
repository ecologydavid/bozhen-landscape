import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

test('renders the brand and primary quote action', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getByText('柏鎮園藝')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '取得專屬報價' })).toHaveAttribute(
    'href',
    '#quote',
  )
})
