import { StrictMode, useRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useActiveScene } from './useActiveScene'

let observerCallback
let observerInstances
let originalIntersectionObserver
let originalRequestAnimationFrame
let originalCancelAnimationFrame
let originalInnerWidth
let originalInnerHeight
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

function ScopedProbe() {
  const rootRef = useRef(null)
  const active = useActiveScene(['plant', 'stone'], rootRef)

  return (
    <>
      <aside data-scene="stone" />
      <main ref={rootRef}>
        <section data-scene="plant" />
        <section data-scene="stone" />
      </main>
      <output>{active}</output>
    </>
  )
}

beforeEach(() => {
  originalIntersectionObserver = window.IntersectionObserver
  originalRequestAnimationFrame = window.requestAnimationFrame
  originalCancelAnimationFrame = window.cancelAnimationFrame
  originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')
  originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')
  Object.defineProperties(window, {
    innerWidth: { configurable: true, value: 1200 },
    innerHeight: { configurable: true, value: 1000 },
  })
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
  Object.defineProperty(window, 'innerWidth', originalInnerWidth)
  Object.defineProperty(window, 'innerHeight', originalInnerHeight)
})

test('activates the most visible scene', () => {
  document.body.innerHTML =
    '<section data-scene="plant"></section><section data-scene="stone"></section>'

  render(<Probe />)

  const nodes = document.querySelectorAll('[data-scene]')
  const observer = observerInstances[0]

  expect(observer.options).toEqual({
    rootMargin: '-180px 0px -380px 0px',
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

test('does not observe matching markers outside the supplied scene root', () => {
  const { container } = render(<ScopedProbe />)

  const externalMarker = container.querySelector('aside[data-scene="stone"]')
  const scopedMarkers = container.querySelectorAll('main [data-scene]')
  const observer = observerInstances[0]

  expect(observer.observed).toEqual([...scopedMarkers])
  expect(observer.observed).not.toContain(externalMarker)
})

test('refines cached ratios against the central pixel root on a wide viewport', () => {
  document.body.innerHTML =
    '<section data-scene="plant"></section><section data-scene="stone"></section>'

  Object.defineProperties(window, {
    innerWidth: { configurable: true, value: 1920 },
    innerHeight: { configurable: true, value: 947 },
  })

  render(<Probe />)

  const [plant, stone] = document.querySelectorAll('[data-scene]')
  const observer = observerInstances[0]
  const rootTop = window.innerHeight * 0.18
  const rootBottom = window.innerHeight * 0.62

  expect(observer.options).toEqual({
    rootMargin: '-170.46px 0px -359.86px 0px',
    threshold: [0.2, 0.4, 0.6, 0.8],
  })

  vi.spyOn(plant, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    right: window.innerWidth,
    bottom: 700,
    left: 0,
    width: window.innerWidth,
    height: 700,
  })
  vi.spyOn(stone, 'getBoundingClientRect').mockReturnValue({
    top: rootTop + 20,
    right: window.innerWidth * 0.9,
    bottom: rootBottom - 20,
    left: window.innerWidth * -0.1,
    width: window.innerWidth,
    height: rootBottom - rootTop - 40,
  })

  act(() =>
    observerCallback([
      { target: plant, isIntersecting: true, intersectionRatio: 0.72 },
      { target: stone, isIntersecting: true, intersectionRatio: 0.24 },
    ]),
  )
  expect(screen.getByText('plant')).toBeInTheDocument()

  act(() => {
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
  })
  expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)

  act(() => frameCallback())
  expect(screen.getByText('stone')).toBeInTheDocument()
})

test('recreates the observer when the viewport height changes', () => {
  document.body.innerHTML =
    '<section data-scene="plant"></section><section data-scene="stone"></section>'

  render(<Probe />)

  const nodes = document.querySelectorAll('[data-scene]')
  const initialObserver = observerInstances[0]

  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 800,
  })
  act(() => window.dispatchEvent(new Event('resize')))

  const resizedObserver = observerInstances[1]

  expect(initialObserver.disconnect).toHaveBeenCalledOnce()
  expect(resizedObserver.options).toEqual({
    rootMargin: '-144px 0px -304px 0px',
    threshold: [0.2, 0.4, 0.6, 0.8],
  })
  expect(resizedObserver.observed).toEqual([...nodes])
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
