import { act, render, screen } from '@testing-library/react'
import { useActiveScene } from './useActiveScene'

let observerCallback

class ObserverMock {
  constructor(callback) {
    observerCallback = callback
  }

  observe() {}

  disconnect() {}
}

function Probe() {
  const active = useActiveScene(['plant', 'stone'])

  return <output>{active}</output>
}

test('activates the most visible scene', () => {
  window.IntersectionObserver = ObserverMock
  document.body.innerHTML =
    '<section data-scene="plant"></section><section data-scene="stone"></section>'

  render(<Probe />)

  const nodes = document.querySelectorAll('[data-scene]')

  act(() =>
    observerCallback([
      { target: nodes[0], isIntersecting: true, intersectionRatio: 0.24 },
      { target: nodes[1], isIntersecting: true, intersectionRatio: 0.72 },
    ]),
  )

  expect(screen.getByText('stone')).toBeInTheDocument()
})
