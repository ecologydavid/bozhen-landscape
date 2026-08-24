import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Hero from './Hero'
import { siteContent } from '../../data/siteContent'

test('uses the stone and sprout contact treatment in hero actions', () => {
  const { container } = render(
    <MemoryRouter>
      <Hero hero={siteContent.hero} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  expect(container.querySelector('.hero__actions .leaf-contact-links')).toHaveClass(
    'leaf-contact-links--stone-sprout',
  )
})
