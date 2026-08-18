import { fireEvent, render, screen } from '@testing-library/react'
import { HashRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import ProjectDetailPage from './ProjectDetailPage'

test.each([
  ['/projects/nantun-rock-water-garden', '南屯私人宅假山水景'],
  ['/projects/not-a-project', '找不到這個案例'],
])('renders %s correctly', (path, heading) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
})

test('shows real project metadata and a direct LINE contact action', () => {
  window.location.hash = '#/projects/nantun-rock-water-garden'
  const { container } = render(
    <HashRouter>
      <Routes>
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
      </Routes>
    </HashRouter>,
  )

  expect(container.querySelectorAll('a[href^="/"]')).toHaveLength(0)
  expect(screen.getByText('台中南屯')).toBeInTheDocument()
  expect(screen.getByText('假山水景', { selector: 'li' })).toBeInTheDocument()
  expect(screen.getByText('庭園設計', { selector: 'li' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /LINE 聯絡/ })).toHaveAttribute(
    'href',
    'https://line.me/ti/p/~0921047049',
  )
})

test('keeps gallery pictures and final fallbacks as direct grid children', () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/projects/nantun-rock-water-garden']}>
      <Routes>
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  const gallery = container.querySelector('.project-gallery__grid')

  expect(gallery.firstElementChild).toHaveProperty('tagName', 'PICTURE')
  const firstImage = gallery.querySelector('img')
  fireEvent.error(firstImage)
  fireEvent.error(gallery.querySelector('img'))

  expect(gallery.firstElementChild).toHaveClass('image-fallback')
})
