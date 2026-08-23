import { fireEvent, render, screen } from '@testing-library/react'
import { HashRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import ProjectDetailPage from './ProjectDetailPage'
import { projects } from '../data/projects'

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
  expect(screen.getAllByText('台中南屯')).toHaveLength(2)
  expect(screen.getByText('假山水景', { selector: 'li' })).toBeInTheDocument()
  expect(screen.getByText('庭園設計', { selector: 'li' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /LINE 聯絡/ })).toHaveAttribute(
    'href',
    'https://line.me/ti/p/~0921047049',
  )
})

test('summarizes the project facts before the longer narrative', () => {
  const project = projects.find(({ slug }) => slug === 'nantun-rock-water-garden')
  render(
    <MemoryRouter initialEntries={['/projects/nantun-rock-water-garden']}>
      <Routes>
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )

  const facts = screen.getByRole('region', { name: '案例工程摘要' })
  expect(facts).toBeInTheDocument()
  ;['空間類型', '工程地區', '服務範圍', '養護方向'].forEach((label) => {
    expect(screen.getByText(label)).toBeInTheDocument()
  })
  expect(screen.getByText(project.maintenanceNote)).toBeInTheDocument()
  expect(facts.compareDocumentPosition(screen.getByRole('heading', { name: '空間需求' }))).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
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
