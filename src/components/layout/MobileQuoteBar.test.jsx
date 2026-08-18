import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import MobileQuoteBar from './MobileQuoteBar'
import { siteContent } from '../../data/siteContent'

let observerInstances
let originalIntersectionObserver

class ObserverMock {
  constructor(callback) {
    this.callback = callback
    this.disconnect = vi.fn()
    this.observed = []
    observerInstances.push(this)
  }

  observe(node) {
    this.observed.push(node)
  }
}

function addHero() {
  const hero = document.createElement('section')
  hero.id = 'home'
  document.body.append(hero)
  return hero
}

function renderBar(pathname, strict = false) {
  const content = (
    <MemoryRouter initialEntries={[pathname]}>
      <MobileQuoteBar contact={siteContent.contact} />
    </MemoryRouter>
  )

  return render(strict ? <StrictMode>{content}</StrictMode> : content)
}

beforeEach(() => {
  originalIntersectionObserver = window.IntersectionObserver
  window.IntersectionObserver = ObserverMock
  observerInstances = []
})

afterEach(() => {
  window.IntersectionObserver = originalIntersectionObserver
  document.getElementById('home')?.remove()
})

test('hides homepage quick contacts before the Hero leaves the viewport', () => {
  const hero = addHero()

  const { container } = renderBar('/')

  const navigation = container.querySelector('.mobile-contact-bar')
  expect(navigation).toHaveClass('mobile-contact-bar')
  expect(navigation).not.toHaveClass('is-visible')
  expect(navigation).toHaveAttribute('aria-hidden', 'true')
  expect(navigation).toHaveAttribute('inert')
  expect(observerInstances[0].observed).toEqual([hero])
})

test('shows homepage quick contacts after the Hero leaves the viewport', () => {
  const hero = addHero()

  renderBar('/')

  act(() => observerInstances[0].callback([{ target: hero, isIntersecting: false }]))

  const navigation = screen.getByRole('navigation', { name: '快速聯絡' })
  expect(navigation).toHaveClass('is-visible')
  expect(navigation).toHaveAttribute('aria-hidden', 'false')
  expect(navigation).not.toHaveAttribute('inert')
})

test('shows quick contacts immediately on non-home routes', () => {
  renderBar('/projects')

  const navigation = screen.getByRole('navigation', { name: '快速聯絡' })
  expect(navigation).toHaveClass('is-visible')
  expect(navigation).toHaveAttribute('aria-hidden', 'false')
  expect(observerInstances).toHaveLength(0)
  expect(screen.getByRole('link', { name: 'LINE 聯絡' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '撥打 0921-047-049' })).toBeInTheDocument()
})

test('disconnects every Hero observer created by StrictMode', () => {
  addHero()

  const { unmount } = renderBar('/', true)
  unmount()

  expect(observerInstances.length).toBeGreaterThanOrEqual(2)
  expect(observerInstances.every((observer) => observer.disconnect.mock.calls.length)).toBe(
    true,
  )
})
