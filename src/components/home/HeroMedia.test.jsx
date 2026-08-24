import { fireEvent, render, screen } from '@testing-library/react'
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

test('renders a muted inline loop over the static hero image', () => {
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
  expect(video).toHaveAttribute('poster', siteContent.hero.image.src)
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
  expect(video).toHaveAttribute('playsinline')
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

test('cleans up the connection change listener when unmounted', () => {
  mockMotionPreference(false)
  const connection = mockConnectionPreference(false)
  const { unmount } = render(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )

  expect(connection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  const changeListener = connection.addEventListener.mock.calls[0][1]

  unmount()

  expect(connection.removeEventListener).toHaveBeenCalledWith('change', changeListener)
})
