import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import { siteContent } from '../../data/siteContent'

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
