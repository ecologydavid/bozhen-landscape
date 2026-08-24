import { fireEvent, render, screen } from '@testing-library/react'
import { act, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, vi } from 'vitest'
import HeroMedia from './HeroMedia'
import { siteContent } from '../../data/siteContent'

let restoreConnectionPreference = () => {}
let restoreViewport = () => {}

function mockMotionPreference(matches) {
  const mediaQuery = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
  return mediaQuery
}

function mockConnectionPreference(saveData) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'connection')
  const connection = {
    saveData,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }

  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: connection,
  })

  restoreConnectionPreference = () => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'connection', originalDescriptor)
    } else {
      delete navigator.connection
    }
  }

  return connection
}

function mockViewport(width) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth')
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })

  restoreViewport = () => {
    if (originalDescriptor) {
      Object.defineProperty(window, 'innerWidth', originalDescriptor)
    } else {
      delete window.innerWidth
    }
  }
}

afterEach(() => {
  restoreConnectionPreference()
  restoreConnectionPreference = () => {}
  restoreViewport()
  restoreViewport = () => {}
  vi.unstubAllGlobals()
})

test('renders a muted inline loop over the responsive static hero image without a duplicate video poster', () => {
  mockMotionPreference(false)
  render(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )

  const video = screen.getByTestId('hero-video')
  expect(video).toHaveAttribute('src', '/hero.mp4')
  expect(video).not.toHaveAttribute('poster')
  expect(video).toHaveAttribute('autoplay')
  expect(video).toHaveAttribute('loop')
  expect(video).toHaveAttribute('playsinline')
  expect(video).toHaveProperty('muted', true)
  expect(screen.getByRole('img', { name: siteContent.hero.alt })).toHaveAttribute(
    'fetchpriority',
    'high',
  )
})

test('keeps the static image when the video fails', () => {
  mockMotionPreference(false)
  render(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )

  fireEvent.error(screen.getByTestId('hero-video'))

  expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: siteContent.hero.alt })).toBeInTheDocument()
})

test('does not mount video when reduced motion is requested', () => {
  mockMotionPreference(true)
  render(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )

  expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: siteContent.hero.alt })).toBeInTheDocument()
})

test('plays the hero film on a 390px viewport when motion and data saving are allowed', () => {
  mockViewport(390)
  vi.stubGlobal('matchMedia', vi.fn((query) => ({
    matches: query === '(max-width: 768px)' && window.innerWidth <= 768,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
  mockConnectionPreference(false)
  render(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )

  const video = screen.getByTestId('hero-video')
  expect(video).toHaveAttribute('autoplay')
  expect(video).toHaveAttribute('loop')
  expect(video).toHaveAttribute('playsinline')
  expect(video).toHaveAttribute('preload', 'metadata')
  expect(video).toHaveProperty('muted', true)
})

test('selects the lightweight mobile film at a 390px viewport', () => {
  mockViewport(390)
  vi.stubGlobal('matchMedia', vi.fn((query) => ({
    matches: query === '(max-width: 768px)' && window.innerWidth <= 768,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
  mockConnectionPreference(false)
  render(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc={{ desktop: '/hero-desktop.mp4', mobile: '/hero-mobile.mp4' }}
    />,
  )

  expect(screen.getByTestId('hero-video')).toHaveAttribute('src', '/hero-mobile.mp4')
})

test('keeps the static hero image when the connection requests data saving', () => {
  mockMotionPreference(false)
  mockConnectionPreference(true)
  render(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )

  expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: siteContent.hero.alt })).toBeInTheDocument()
})

test('balances connection change listener setup and cleanup in StrictMode', () => {
  mockMotionPreference(false)
  const connection = mockConnectionPreference(false)
  const { unmount } = render(
    <StrictMode>
      <HeroMedia
        image={siteContent.hero.image}
        alt={siteContent.hero.alt}
        videoSrc="/hero.mp4"
      />
    </StrictMode>,
  )

  const addedListeners = connection.addEventListener.mock.calls
    .filter(([eventName]) => eventName === 'change')
    .map(([, listener]) => listener)
  expect(addedListeners.length).toBeGreaterThan(0)

  unmount()

  const removedListeners = connection.removeEventListener.mock.calls
    .filter(([eventName]) => eventName === 'change')
    .map(([, listener]) => listener)
  expect(removedListeners).toHaveLength(addedListeners.length)
  expect(removedListeners).toEqual(expect.arrayContaining(addedListeners))
})

test('resets video readiness after data saving blocks and re-allows playback', () => {
  mockMotionPreference(false)
  const connection = mockConnectionPreference(false)
  render(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )

  fireEvent.canPlay(screen.getByTestId('hero-video'))
  expect(screen.getByTestId('hero-video')).toHaveClass('is-ready')

  const changeListener = connection.addEventListener.mock.calls
    .find(([eventName]) => eventName === 'change')[1]
  act(() => {
    connection.saveData = true
    changeListener()
  })
  expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument()

  act(() => {
    connection.saveData = false
    changeListener()
  })
  expect(screen.getByTestId('hero-video')).not.toHaveClass('is-ready')
})

test('renders no video in the server response before client preferences mount', () => {
  mockMotionPreference(false)
  mockConnectionPreference(false)

  const markup = renderToString(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )

  expect(markup).not.toContain('data-testid="hero-video"')
})

test.each([
  ['reduced motion', true, false],
  ['data saving', false, true],
])('hydrates the static server markup without video when %s is enabled', async (_name, reducedMotion, saveData) => {
  mockMotionPreference(reducedMotion)
  mockConnectionPreference(saveData)
  const container = document.createElement('div')
  container.innerHTML = renderToString(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )
  document.body.append(container)

  let root
  try {
    expect(container.querySelector('[data-testid="hero-video"]')).not.toBeInTheDocument()

    await act(async () => {
      root = hydrateRoot(
        container,
        <HeroMedia
          image={siteContent.hero.image}
          alt={siteContent.hero.alt}
          videoSrc="/hero.mp4"
        />,
      )
    })

    expect(container.querySelector('[data-testid="hero-video"]')).not.toBeInTheDocument()
  } finally {
    if (root) {
      await act(async () => root.unmount())
    }
    container.remove()
  }
})

test('renders on the server when window is unavailable', () => {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: undefined,
  })

  try {
    let markup
    expect(() => {
      markup = renderToString(
        <HeroMedia
          image={siteContent.hero.image}
          alt={siteContent.hero.alt}
          videoSrc="/hero.mp4"
        />,
      )
    }).not.toThrow()
    expect(markup).not.toContain('data-testid="hero-video"')
  } finally {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor)
    } else {
      delete globalThis.window
    }
  }
})
