import { render, screen } from '@testing-library/react'
import LeafContactLinks from './LeafContactLinks'
import { siteContent } from '../../data/siteContent'

test('renders the LINE and phone contact links from site content', () => {
  const { container } = render(<LeafContactLinks contact={siteContent.contact} />)

  expect(container.querySelector('.leaf-contact-links')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'LINE 聯絡' })).toHaveAttribute(
    'href',
    'https://line.me/ti/p/~0921047049',
  )
  expect(screen.getByRole('link', { name: 'LINE 聯絡' })).toHaveClass('leaf-contact-links__line')
  expect(screen.getByRole('link', { name: '撥打 0921-047-049' })).toHaveAttribute(
    'href',
    'tel:+886921047049',
  )
})
