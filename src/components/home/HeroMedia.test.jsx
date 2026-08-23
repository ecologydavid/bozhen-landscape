import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import HeroMedia from './HeroMedia'
import { siteContent } from '../../data/siteContent'

function mockMotionPreference(matches) {
  const mediaQuery = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
  return mediaQuery
}

afterEach(() => vi.unstubAllGlobals())

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
