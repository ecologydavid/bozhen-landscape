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

test('keeps string sources compatible without an AVIF source', () => {
  const { container } = render(<BrandImage src="/garden.webp" alt="庭園" />)

  expect(container.querySelector('picture')).toBeInTheDocument()
  expect(container.querySelector('source')).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: '庭園' })).toHaveAttribute('src', '/garden.webp')
})

test('scopes fallback state to the current source and preserves caller errors', () => {
  const onError = vi.fn()
  const { rerender } = render(
    <BrandImage
      src={{ src: '/broken.webp', avifSrc: '/broken.avif' }}
      alt="測試庭園"
      className="hero__image"
      onError={onError}
    />,
  )

  fireEvent.error(screen.getByRole('img', { name: '測試庭園' }))
  expect(onError).toHaveBeenCalledTimes(1)
  expect(
    screen.getByRole('img', { name: '測試庭園（圖片暫時無法顯示）' }),
  ).toHaveClass('image-fallback', 'hero__image')

  rerender(<BrandImage src="/working.webp" alt="測試庭園" />)
  expect(screen.getByRole('img', { name: '測試庭園' })).toHaveAttribute(
    'src',
    '/working.webp',
  )
})
