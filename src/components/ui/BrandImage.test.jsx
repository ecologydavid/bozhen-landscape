import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import BrandImage from './BrandImage'

test('scopes fallback state to the current source and preserves caller errors', () => {
  const onError = vi.fn()
  const { rerender } = render(
    <BrandImage src="/broken.webp" alt="測試庭園" onError={onError} />,
  )

  fireEvent.error(screen.getByRole('img', { name: '測試庭園' }))
  expect(onError).toHaveBeenCalledTimes(1)
  expect(
    screen.getByRole('img', { name: '測試庭園（圖片暫時無法顯示）' }),
  ).toBeInTheDocument()

  rerender(<BrandImage src="/working.webp" alt="測試庭園" />)
  expect(screen.getByRole('img', { name: '測試庭園' })).toHaveAttribute(
    'src',
    '/working.webp',
  )
})
