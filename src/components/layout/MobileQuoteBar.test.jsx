import { render, screen } from '@testing-library/react'
import MobileQuoteBar from './MobileQuoteBar'
import { siteContent } from '../../data/siteContent'

test('provides the quick contacts in a named navigation landmark', () => {
  render(<MobileQuoteBar contact={siteContent.contact} />)

  const navigation = screen.getByRole('navigation', { name: '快速聯絡' })
  expect(navigation).toHaveClass('mobile-contact-bar')
  expect(screen.getByRole('link', { name: 'LINE 聯絡' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '撥打 0921-047-049' })).toBeInTheDocument()
})
