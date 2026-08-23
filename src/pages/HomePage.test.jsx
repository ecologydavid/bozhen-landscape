import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, vi } from 'vitest'
import HomePage from './HomePage'
import { siteContent } from '../data/siteContent'
import { homeScenes } from '../data/homeScenes'

let observerCallback

class ObserverMock {
  constructor(callback) {
    observerCallback = callback
    this.observed = []
  }

  observe(node) {
    this.observed.push(node)
  }

  disconnect() {}
}

afterEach(() => vi.unstubAllGlobals())

test('renders the approved works-first homepage sections', () => {
  const { container } = render(
    <MemoryRouter>
      <HomePage
        brand={siteContent.brand}
        contact={siteContent.contact}
        hero={siteContent.hero}
      />
    </MemoryRouter>,
  )

  const sceneSections = container.querySelectorAll('.scene-section[data-scene]')
  expect([...sceneSections].map((section) => section.dataset.scene)).toEqual([
    'plant',
    'stone',
    'water',
    'craft',
    'care',
  ])
  expect(container.querySelector('.editorial-home')).toHaveAttribute(
    'data-active-scene',
    'plant',
  )
  const home = container.querySelector('.editorial-home')
  expect([...home.querySelectorAll(':scope > section')].map((section) => section.className)).toEqual([
    'hero scene-section',
    'featured-projects section scene-section',
    'services section scene-section',
    'work-process section scene-section',
    'contact-panel section scene-section',
  ])
  const bridge = home.querySelector('.craft-care-bridge')
  expect(bridge).toHaveAttribute('data-transition', 'craft-to-care')
  expect([...bridge.querySelectorAll(':scope > section')].map((section) => section.className)).toEqual([
    'garden-journal section',
    'brand-story section',
    'client-types section',
  ])
  homeScenes.forEach(({ id, sectionId }) => {
    expect(home.querySelector(`#${sectionId}`)).toHaveAttribute('data-scene', id)
  })

  const heroHeading = screen.getByRole('heading', { name: '把自然，安放進日常' })
  const worksHeading = screen.getByRole('heading', { name: '作品，是最直接的回答' })
  const servicesHeading = screen.getByRole('heading', { name: '以專業工法，完成自然的尺度' })
  expect(heroHeading).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '彰化私人住宅庭園實景' })).toHaveAttribute(
    'sizes',
    '(max-width: 768px) calc(100vw - 52px), (max-width: 1280px) 54vw, 720px',
  )
  expect(screen.getByRole('img', { name: '彰化私人住宅庭園實景' })).toHaveAttribute(
    'fetchpriority',
    'high',
  )
  expect(screen.getByRole('img', {
    name: '彰化私人住宅整理完成後的植栽與石材鋪面庭園',
  })).toHaveAttribute('loading', 'lazy')
  expect(heroHeading.compareDocumentPosition(worksHeading)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  expect(worksHeading.compareDocumentPosition(servicesHeading)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  expect(screen.getAllByRole('link', { name: /查看案例/ })).toHaveLength(3)
  expect(
    screen.getByRole('heading', { name: '直接與曜聖聯絡' }),
  ).toBeInTheDocument()
  const lineLinks = screen.getAllByRole('link', { name: /LINE 聯絡/ })
  expect(lineLinks).toHaveLength(2)
  lineLinks.forEach((link) =>
    expect(link).toHaveAttribute('href', 'https://line.me/ti/p/~0921047049'),
  )
  const phoneLinks = screen.getAllByRole('link', { name: /撥打 0921-047-049/ })
  expect(phoneLinks).toHaveLength(2)
  phoneLinks.forEach((link) =>
    expect(link).toHaveAttribute('href', 'tel:+886921047049'),
  )
  expect(
    screen.queryByRole('button', { name: '送出報價需求' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: '作品，是最直接的回答' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '以專業工法，完成自然的尺度' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '從理解現場，到風景落成' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '曜聖庭園誌' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '直接與曜聖聯絡' })).toBeInTheDocument()
})

test('syncs the active home scene with its environment layer', () => {
  vi.stubGlobal('IntersectionObserver', ObserverMock)
  const { container } = render(
    <MemoryRouter>
      <HomePage
        brand={siteContent.brand}
        contact={siteContent.contact}
        hero={siteContent.hero}
      />
    </MemoryRouter>,
  )

  const home = container.querySelector('.editorial-home')
  const water = home.querySelector('[data-scene="water"]')

  act(() =>
    observerCallback([
      { target: water, isIntersecting: true, intersectionRatio: 0.72 },
    ]),
  )

  expect(home).toHaveAttribute('data-active-scene', 'water')
  expect(home.querySelector('[data-environment="water"]')).toHaveClass('is-active')
  expect(home.querySelector('[data-environment="plant"]')).not.toHaveClass('is-active')
})
