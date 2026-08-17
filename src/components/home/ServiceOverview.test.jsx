import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ServiceOverview from './ServiceOverview'

test('renders image-led services without decorative ordinals', () => {
  const { container } = render(
    <MemoryRouter>
      <ServiceOverview />
    </MemoryRouter>,
  )
  expect(screen.getAllByRole('article')).toHaveLength(4)
  expect(
    screen.getByRole('img', { name: '住宅庭園的石材鋪面與植栽配置' }),
  ).toBeInTheDocument()
  expect(screen.queryByText('01')).not.toBeInTheDocument()
  expect(container.querySelectorAll('.service-card__tag')).toHaveLength(4)
})
