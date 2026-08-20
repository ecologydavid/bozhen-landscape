import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import StudioRoot from './StudioRoot'

vi.mock('./auth/StudioAuthProvider', () => ({
  default: ({ children }) => children,
}))

vi.mock('./StudioApp', () => ({
  default: () => <div>Studio application</div>,
}))

test('scopes the Studio body reset to the route lifetime', () => {
  document.body.classList.add('existing-body-class')

  const { unmount } = render(<StudioRoot />)

  expect(screen.getByText('Studio application')).toBeInTheDocument()
  expect(document.body).toHaveClass('studio-active', 'existing-body-class')

  unmount()

  expect(document.body).not.toHaveClass('studio-active')
  expect(document.body).toHaveClass('existing-body-class')
  document.body.classList.remove('existing-body-class')
})
