import { render, screen } from '@testing-library/react'
import LeafContactLinks from './LeafContactLinks'
import { siteContent } from '../../data/siteContent'

test('renders the LINE and phone contact links from site content', () => {
  const { container } = render(<LeafContactLinks contact={siteContent.contact} />)

  expect(container.querySelector('.leaf-contact-links')).toBeInTheDocument()
  const lineLink = screen.getByRole('link', { name: 'LINE 聯絡' })
  const phoneLink = screen.getByRole('link', { name: '撥打 0921-047-049' })

  expect(lineLink).toHaveAttribute('href', siteContent.contact.lineHref)
  expect(lineLink).toHaveClass('leaf-contact-links__item', 'leaf-contact-links__line')
  expect(phoneLink).toHaveAttribute('href', siteContent.contact.phoneHref)
  expect(phoneLink).toHaveClass('leaf-contact-links__item', 'leaf-contact-links__phone')
})
