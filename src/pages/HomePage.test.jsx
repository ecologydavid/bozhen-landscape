import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'

test('renders the approved works-first homepage sections', () => {
  render(
    <MemoryRouter>
      <HomePage onUnavailable={() => {}} />
    </MemoryRouter>,
  )

  expect(
    screen.getByRole('heading', { name: '讓自然，成為生活的風景' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: '以專業工法，完成自然的尺度' }),
  ).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /查看案例/ })).toHaveLength(3)
})
