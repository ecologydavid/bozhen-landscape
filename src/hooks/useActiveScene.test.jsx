import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useActiveScene } from './useActiveScene'

let observerCallback
let observerInstances
let originalIntersectionObserver

class ObserverMock {
  constructor(callback, options) {
    observerCallback = callback
    this.options = options
    this.observed = []
    this.disconnect = vi.fn()
    observerInstances.push(this)
  }

  observe(node) {
    this.observed.push(node)
  }
}

function Probe({ sceneIds = ['plant', 'stone'] }) {
  const active = useActiveScene(sceneIds)

  return <output>{active}</output>
}

beforeEach(() => {
  originalIntersectionObserver = window.IntersectionObserver
  window.IntersectionObserver = ObserverMock
  observerCallback = undefined
  observerInstances = []
})

afterEach(() => {
  window.IntersectionObserver = originalIntersectionObserver
})

test('activates the dominant scene from sequential partial observer batches', () => {
  document.body.innerHTML =
    '<section data-scene="plant"></section><section data-scene="stone"></section>'

  render(<Probe />)

  const nodes = document.querySelectorAll('[data-scene]')
  const observer = observerInstances[0]

  expect(observer.options).toEqual({
    rootMargin: '-18% 0px -38% 0px',
    threshold: Array.from({ length: 101 }, (_, index) => index / 100),
  })
  expect(observer.observed).toEqual([...nodes])

  act(() =>
    observerCallback([
      { target: nodes[0], isIntersecting: true, intersectionRatio: 0.72 },
    ]),
  )
  expect(screen.getByText('plant')).toBeInTheDocument()

  act(() =>
    observerCallback([
      { target: nodes[1], isIntersecting: true, intersectionRatio: 0.55 },
    ]),
  )
  expect(screen.getByText('stone')).toBeInTheDocument()
})

test('does not observe or activate unsupported scene markers', () => {
  document.body.innerHTML =
    '<section data-scene="plant"></section><section data-scene="stone"></section><aside data-scene="unrelated"></aside>'

  render(<Probe />)

  const [plant, stone, unrelated] = document.querySelectorAll('[data-scene]')
  const observer = observerInstances[0]

  expect(observer.observed).toEqual([plant, stone])

  act(() =>
    observerCallback([
      { target: unrelated, isIntersecting: true, intersectionRatio: 0.99 },
    ]),
  )

  expect(screen.getByText('plant')).toBeInTheDocument()
})

test('disconnects every observer created by StrictMode', () => {
  document.body.innerHTML = '<section data-scene="plant"></section>'

  const { unmount } = render(
    <StrictMode>
      <Probe sceneIds={['plant']} />
    </StrictMode>,
  )

  unmount()

  expect(observerInstances.length).toBeGreaterThanOrEqual(2)
  expect(observerInstances.every((observer) => observer.disconnect.mock.calls.length)).toBe(
    true,
  )
})
