import { render } from '@testing-library/react'
import ScrollEnvironment from './ScrollEnvironment'
import { homeScenes } from '../../data/homeScenes'

test('renders every scene layer and marks the active environment', () => {
  const { container } = render(
    <ScrollEnvironment scenes={homeScenes} activeScene="water" />,
  )

  const environment = container.querySelector('.scene-environment')
  const layers = container.querySelectorAll('[data-environment]')

  expect(environment).toHaveAttribute('aria-hidden', 'true')
  expect(layers).toHaveLength(5)
  expect(container.querySelector('[data-environment="water"]')).toHaveClass(
    'is-active',
  )
})
