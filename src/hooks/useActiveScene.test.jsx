import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useActiveScene } from './useActiveScene'

let observerCallback
let observerInstances
let originalIntersectionObserver
let originalRequestAnimationFrame
let originalCancelAnimationFrame
let requestAnimationFrameMock
let cancelAnimationFrameMock
let frameCallback

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
  originalRequestAnimationFrame = window.requestAnimationFrame
  originalCancelAnimationFrame = window.cancelAnimationFrame
  window.IntersectionObserver = ObserverMock
  requestAnimationFrameMock = vi.fn((callback) => {
    frameCallback = callback
    return 1
  })
  cancelAnimationFrameMock = vi.fn()
  window.requestAnimationFrame = requestAnimationFrameMock
  window.cancelAnimationFrame = cancelAnimationFrameMock
  observerCallback = undefined
  observerInstances = []
  frameCallback = undefined
})

afterEach(() => {
  window.IntersectionObserver = originalIntersectionObserver
  window.requestAnimationFrame = originalRequestAnimationFrame
  window.cancelAnimationFrame = originalCancelAnimationFrame
})

test('activates the most visible scene', () => {
  document.body.innerHTML =
    '<section data-scene="plant"></section><section data-scene="stone"></section>'

  render(<Probe />)

  const nodes = document.querySelectorAll('[data-scene]')
  const observer = observerInstances[0]

  expect(observer.options).toEqual({
    rootMargin: '-18% 0px -38% 0px',
    threshold: [0.2, 0.4, 0.6, 0.8],
  })
  expect(observer.observed).toEqual([...nodes])

  act(() =>
    observerCallback([
      { target: nodes[0], isIntersecting: true, intersectionRatio: 0.24 },
      { target: nodes[1], isIntersecting: true, intersectionRatio: 0.72 },
    ]),
  )
  expect(screen.getByText('stone')).toBeInTheDocument()
})

test('preserves the dominant scene across sequential partial observer batches', () => {
  document.body.innerHTML =
    '<section data-scene="plant"></section><section data-scene="stone"></section>'

  render(<Probe />)

  const nodes = document.querySelectorAll('[data-scene]')

  act(() =>
    observerCallback([
      { target: nodes[0], isIntersecting: true, intersectionRatio: 0.72 },
      { target: nodes[1], isIntersecting: true, intersectionRatio: 0.24 },
    ]),
  )
  expect(screen.getByText('plant')).toBeInTheDocument()

  act(() =>
    observerCallback([
      { target: nodes[1], isIntersecting: true, intersectionRatio: 0.55 },
    ]),
  )
  expect(screen.getByText('plant')).toBeInTheDocument()

  act(() =>
    observerCallback([
      { target: nodes[1], isIntersecting: true, intersectionRatio: 0.73 },
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

test('refines cached observer ratios from viewport geometry on scroll', () => {
  document.body.innerHTML =
    '<section data-scene="plant"></section><section data-scene="stone"></section>'

  render(<Probe />)

  const [plant, stone] = document.querySelectorAll('[data-scene]')
  vi.spyOn(plant, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    right: 400,
    bottom: 400,
    left: 0,
    width: 400,
    height: 400,
  })
  vi.spyOn(stone, 'getBoundingClientRect').mockReturnValue({
    top: -200,
    right: 400,
    bottom: 200,
    left: 0,
    width: 400,
    height: 400,
  })

  act(() =>
    observerCallback([
      { target: plant, isIntersecting: true, intersectionRatio: 0.24 },
      { target: stone, isIntersecting: true, intersectionRatio: 0.72 },
    ]),
  )
  expect(screen.getByText('stone')).toBeInTheDocument()

  act(() => {
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
  })
  expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)

  act(() => frameCallback())
  expect(screen.getByText('plant')).toBeInTheDocument()
})

test('keeps observer ratios when jsdom geometry has no area', () => {
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

  act(() => window.dispatchEvent(new Event('resize')))
  act(() => frameCallback())

  expect(screen.getByText('stone')).toBeInTheDocument()
})

test('disconnects every observer created by StrictMode', () => {
  document.body.innerHTML = '<section data-scene="plant"></section>'

  const { unmount } = render(
    <StrictMode>
      <Probe sceneIds={['plant']} />
    </StrictMode>,
  )

  act(() => window.dispatchEvent(new Event('scroll')))
  unmount()

  expect(observerInstances.length).toBeGreaterThanOrEqual(2)
  expect(observerInstances.every((observer) => observer.disconnect.mock.calls.length)).toBe(
    true,
  )
  expect(cancelAnimationFrameMock).toHaveBeenCalledWith(1)

  const scheduledFrames = requestAnimationFrameMock.mock.calls.length
  act(() => window.dispatchEvent(new Event('resize')))
  expect(requestAnimationFrameMock).toHaveBeenCalledTimes(scheduledFrames)
})
