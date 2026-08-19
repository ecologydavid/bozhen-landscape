import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import BrandImage from './BrandImage'

test('prefers AVIF while preserving the WebP fallback', () => {
  const { container } = render(
    <BrandImage
      src={{ src: '/garden.webp', avifSrc: '/garden.avif' }}
      alt="庭園"
    />,
  )

  expect(container.querySelector('source')).toHaveAttribute('srcset', '/garden.avif')
  expect(screen.getByRole('img', { name: '庭園' })).toHaveAttribute('src', '/garden.webp')
})

test('forwards responsive candidates and sizes to both formats', () => {
  const { container } = render(
    <BrandImage
      src={{
        src: '/garden.webp',
        avifSrc: '/garden.avif',
        srcSet: '/garden-480.webp 480w, /garden.webp 1920w',
        avifSrcSet: '/garden-480.avif 480w, /garden.avif 1920w',
      }}
      sizes="(max-width: 768px) calc(100vw - 52px), 720px"
      alt="庭園"
    />,
  )

  expect(container.querySelector('source')).toHaveAttribute(
    'srcset',
    '/garden-480.avif 480w, /garden.avif 1920w',
  )
  expect(container.querySelector('source')).toHaveAttribute(
    'sizes',
    '(max-width: 768px) calc(100vw - 52px), 720px',
  )
  expect(screen.getByRole('img', { name: '庭園' })).toHaveAttribute(
    'srcset',
    '/garden-480.webp 480w, /garden.webp 1920w',
  )
  expect(screen.getByRole('img', { name: '庭園' })).toHaveAttribute(
    'sizes',
    '(max-width: 768px) calc(100vw - 52px), 720px',
  )
})

test('keeps string sources compatible without an AVIF source', () => {
  const { container } = render(<BrandImage src="/garden.webp" alt="庭園" />)

  expect(container.querySelector('picture')).toBeInTheDocument()
  expect(container.querySelector('source')).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: '庭園' })).toHaveAttribute('src', '/garden.webp')
})

test('retries the WebP before reporting one final image error', () => {
  const onError = vi.fn()
  const { container, rerender } = render(
    <BrandImage
      src={{ src: '/broken.webp', avifSrc: '/broken.avif' }}
      alt="測試庭園"
      className="hero__image"
      onError={onError}
    />,
  )

  fireEvent.error(screen.getByRole('img', { name: '測試庭園' }))
  expect(onError).not.toHaveBeenCalled()
  expect(container.querySelector('source')).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: '測試庭園' })).toHaveAttribute(
    'src',
    '/broken.webp',
  )

  fireEvent.error(screen.getByRole('img', { name: '測試庭園' }))
  expect(onError).toHaveBeenCalledTimes(1)
  expect(
    screen.getByRole('img', { name: '測試庭園（圖片暫時無法顯示）' }),
  ).toHaveClass('image-fallback', 'hero__image')

  rerender(
    <BrandImage
      src={{ src: '/working.webp', avifSrc: '/working.avif' }}
      alt="測試庭園"
    />,
  )
  expect(container.querySelector('source')).toHaveAttribute(
    'srcset',
    '/working.avif',
  )
  expect(screen.getByRole('img', { name: '測試庭園' })).toHaveAttribute(
    'src',
    '/working.webp',
  )

  rerender(
    <BrandImage
      src={{ src: '/broken.webp', avifSrc: '/broken.avif' }}
      alt="測試庭園"
    />,
  )
  expect(container.querySelector('source')).toHaveAttribute(
    'srcset',
    '/broken.avif',
  )
  expect(screen.getByRole('img', { name: '測試庭園' })).toHaveAttribute(
    'src',
    '/broken.webp',
  )
})
