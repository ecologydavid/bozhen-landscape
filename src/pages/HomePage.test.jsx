import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'
import { siteContent } from '../data/siteContent'

test('renders the approved works-first homepage sections', () => {
  render(
    <MemoryRouter>
      <HomePage
        brand={siteContent.brand}
        contact={siteContent.contact}
        hero={siteContent.hero}
      />
    </MemoryRouter>,
  )

  const heroHeading = screen.getByRole('heading', { name: '把自然，安放進日常' })
  const worksHeading = screen.getByRole('heading', { name: '作品，是最直接的回答' })
  const servicesHeading = screen.getByRole('heading', { name: '以專業工法，完成自然的尺度' })
  expect(heroHeading).toBeInTheDocument()
  expect(heroHeading.compareDocumentPosition(worksHeading)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  expect(worksHeading.compareDocumentPosition(servicesHeading)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  expect(screen.getAllByRole('link', { name: /查看案例/ })).toHaveLength(3)
  expect(
    screen.getByRole('heading', { name: '直接與曜聖聯絡' }),
  ).toBeInTheDocument()
  const lineLinks = screen.getAllByRole('link', { name: /LINE 聯絡/ })
  expect(lineLinks).toHaveLength(2)
  lineLinks.forEach((link) =>
    expect(link).toHaveAttribute('href', 'https://line.me/ti/p/~0921047049'),
  )
  const phoneLinks = screen.getAllByRole('link', { name: /撥打 0921-047-049/ })
  expect(phoneLinks).toHaveLength(2)
  phoneLinks.forEach((link) =>
    expect(link).toHaveAttribute('href', 'tel:+886921047049'),
  )
  expect(
    screen.queryByRole('button', { name: '送出報價需求' }),
  ).not.toBeInTheDocument()
})
