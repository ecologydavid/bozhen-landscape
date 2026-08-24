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
  expect(lineLink).toHaveAttribute('target', '_blank')
  expect(lineLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  expect(phoneLink).toHaveAttribute('href', siteContent.contact.phoneHref)
  expect(phoneLink).toHaveClass('leaf-contact-links__item', 'leaf-contact-links__phone')
})

test('preserves a custom wrapper class for mobile presentation', () => {
  const { container } = render(
    <LeafContactLinks contact={siteContent.contact} className="leaf-contact-links--mobile" />,
  )

  expect(container.querySelector('.leaf-contact-links')).toHaveClass('leaf-contact-links--mobile')
})

test('renders stone and sprout contact links with icons and directional arrows', () => {
  const { container } = render(
    <LeafContactLinks
      contact={siteContent.contact}
      className="leaf-contact-links--stone-sprout"
    />,
  )

  const wrapper = container.querySelector('.leaf-contact-links')
  const contactLinks = wrapper.querySelectorAll('.leaf-contact-links__item')
  const arrows = wrapper.querySelectorAll('.leaf-contact-links__arrow')

  expect(wrapper).toHaveClass('leaf-contact-links--stone-sprout')
  expect(contactLinks).toHaveLength(2)
  contactLinks.forEach((link) => {
    expect(link.querySelector('svg[data-icon="sprout"]')).toBeInTheDocument()
  })
  expect(arrows).toHaveLength(2)
  arrows.forEach((arrow) => {
    expect(arrow).toHaveTextContent('↗')
    expect(arrow).toHaveAttribute('aria-hidden', 'true')
  })
})
