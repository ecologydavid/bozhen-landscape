import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import { siteContent } from '../../data/siteContent'

test('uses the approved sprout glyph throughout the navigation', () => {
  const { container } = render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  expect(container.querySelectorAll('[data-icon="leaf"], [data-icon="arrowLeaf"]')).toHaveLength(0)
  expect(container.querySelectorAll('[data-icon="sprout"]')).toHaveLength(6)
})

test('opens and closes the mobile navigation with every supported control', async () => {
  const user = userEvent.setup()
  const { container } = render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  expect(container.querySelector('.site-header')).toHaveClass(
    'site-header--on-light',
  )

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).toHaveClass(
    'is-open',
  )
  expect(screen.getByText('01')).toBeVisible()
  expect(screen.getByText('PROJECTS')).toBeVisible()
  expect(screen.getByRole('link', { name: '作品案例' })).toHaveAttribute(
    'href',
    '/projects',
  )
  expect(screen.getByRole('link', { name: '作品案例' })).toHaveFocus()
  expect(screen.getByRole('link', { name: '曜聖景觀有限公司' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /LINE 聯絡/ })).toHaveAttribute(
    'href',
    'https://line.me/ti/p/~0921047049',
  )
  expect(screen.getByRole('link', { name: '撥打 0921-047-049' })).toHaveAttribute(
    'href',
    'tel:+886921047049',
  )
  expect(document.body).toHaveClass('nav-open')

  await user.keyboard('{Escape}')
  expect(document.body).not.toHaveClass('nav-open')
  expect(screen.getByRole('button', { name: '開啟選單' })).toHaveFocus()

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  await user.click(screen.getByRole('button', { name: '關閉選單' }))
  expect(screen.getByRole('button', { name: '開啟選單' })).toHaveFocus()

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  await user.click(screen.getByRole('button', { name: '關閉主要導覽' }))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).not.toHaveClass(
    'is-open',
  )
  expect(document.body).not.toHaveClass('nav-open')
  expect(screen.getByRole('button', { name: '開啟選單' })).toHaveFocus()

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  await user.click(screen.getByRole('link', { name: '作品案例' }))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).not.toHaveClass(
    'is-open',
  )
  expect(document.body).not.toHaveClass('nav-open')
})

test('traps keyboard focus within the open navigation', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(screen.getByRole('link', { name: '作品案例' })).toHaveFocus()

  await user.tab({ shift: true })
  expect(screen.getByRole('link', { name: '撥打 0921-047-049' })).toHaveFocus()

  await user.tab()
  expect(screen.getByRole('link', { name: '作品案例' })).toHaveFocus()
})

test('closes the navigation and restores toggle focus from contact actions', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  const lineLink = screen.getByRole('link', { name: 'LINE 聯絡' })
  lineLink.addEventListener('click', (event) => event.preventDefault(), {
    once: true,
  })
  await user.click(lineLink)
  expect(document.body).not.toHaveClass('nav-open')
  expect(screen.getByRole('button', { name: '開啟選單' })).toHaveFocus()

  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  const phoneLink = screen.getByRole('link', { name: '撥打 0921-047-049' })
  phoneLink.addEventListener('click', (event) => event.preventDefault(), {
    once: true,
  })
  await user.click(phoneLink)
  expect(document.body).not.toHaveClass('nav-open')
  expect(screen.getByRole('button', { name: '開啟選單' })).toHaveFocus()
})

test('keeps the drawer interactive after the header becomes scrolled', async () => {
  const user = userEvent.setup()
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: 25,
  })
  const { container } = render(
    <MemoryRouter>
      <SiteHeader brand={siteContent.brand} contact={siteContent.contact} />
    </MemoryRouter>,
  )

  window.dispatchEvent(new Event('scroll'))
  await waitFor(() =>
    expect(container.querySelector('.site-header')).toHaveClass('is-scrolled'),
  )
  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).toHaveClass(
    'is-open',
  )
})

function PopHarness({ onMenuOpenChange }) {
  const navigate = useNavigate()
  return (
    <>
      <button type="button" onClick={() => navigate('/projects')}>Forward</button>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
      <SiteHeader
        brand={siteContent.brand}
        contact={siteContent.contact}
        onMenuOpenChange={onMenuOpenChange}
      />
    </>
  )
}

test('reports menu state and clears return focus when location changes', async () => {
  const user = userEvent.setup()
  const onMenuOpenChange = vi.fn()
  render(
    <MemoryRouter initialEntries={['/']}>
      <PopHarness onMenuOpenChange={onMenuOpenChange} />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: 'Forward' }))
  await user.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(onMenuOpenChange).toHaveBeenLastCalledWith(true)

  await user.click(screen.getByRole('button', { name: 'Back' }))

  await waitFor(() => expect(onMenuOpenChange).toHaveBeenLastCalledWith(false))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).not.toHaveClass('is-open')
  expect(screen.getByRole('button', { name: '開啟選單' })).not.toHaveFocus()
})
