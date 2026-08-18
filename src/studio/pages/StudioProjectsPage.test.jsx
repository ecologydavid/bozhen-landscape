import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import StudioProjectsPage from './StudioProjectsPage'

vi.mock('../api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { source: 'test' } }))

import { listProjects } from '../api/projects'

beforeEach(() => {
  vi.resetAllMocks()
})

test('marks project loading as an accessible status', () => {
  listProjects.mockReturnValue(new Promise(() => {}))

  render(<MemoryRouter><StudioProjectsPage /></MemoryRouter>)

  expect(screen.getByRole('status')).toHaveTextContent('正在載入案場…')
})

test('lists audience and readiness for every project', async () => {
  listProjects.mockResolvedValue([{
    id: 'p1',
    internal_name: '二林企業廠區',
    public_name: '中部企業廠區景觀',
    audience: 'builder',
    region: '彰化',
    status: 'ready',
    asset_count: 3,
  }])

  render(<MemoryRouter><StudioProjectsPage /></MemoryRouter>)

  expect(await screen.findByText('中部企業廠區景觀')).toBeInTheDocument()
  expect(screen.getByText('內部：二林企業廠區')).toBeInTheDocument()
  expect(screen.getByText('建商')).toBeInTheDocument()
  expect(screen.getByText('彰化')).toBeInTheDocument()
  expect(screen.getByText('可生成')).toBeInTheDocument()
  expect(screen.getByText('3 張素材')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '編輯中部企業廠區景觀' })).toHaveAttribute(
    'href',
    '/studio/projects/p1',
  )
})

test.each([
  ['corporate', '公司開發空間'],
  ['luxury_home', '個人透天豪宅'],
])('localizes the %s audience', async (audience, label) => {
  listProjects.mockResolvedValue([{
    id: audience,
    internal_name: '內部案場',
    public_name: '公開案場',
    audience,
    region: '台中',
    status: 'draft',
    asset_count: 0,
  }])

  render(<MemoryRouter><StudioProjectsPage /></MemoryRouter>)

  expect(await screen.findByText(label)).toBeInTheDocument()
  expect(screen.getByText('草稿')).toBeInTheDocument()
})

test('shows an empty state and a link to add the first project', async () => {
  listProjects.mockResolvedValue([])

  render(<MemoryRouter><StudioProjectsPage /></MemoryRouter>)

  expect(await screen.findByText('目前還沒有案場。')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '新增第一個案場' })).toHaveAttribute(
    'href',
    '/studio/projects/new',
  )
})

test('shows a safe error and retries the project list', async () => {
  const user = userEvent.setup()
  listProjects
    .mockRejectedValueOnce(new Error('database secret'))
    .mockResolvedValueOnce([{
      id: 'p1',
      internal_name: '二林企業廠區',
      public_name: '重試成功案場',
      audience: 'builder',
      region: '彰化',
      status: 'archived',
      asset_count: 1,
    }])

  render(<MemoryRouter><StudioProjectsPage /></MemoryRouter>)

  expect(await screen.findByRole('alert')).toHaveTextContent('無法載入案場，請再試一次。')
  expect(screen.queryByText(/database secret/)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '重新載入' }))

  expect(await screen.findByText('重試成功案場')).toBeInTheDocument()
  expect(screen.getByText('已封存')).toBeInTheDocument()
  await waitFor(() => expect(listProjects).toHaveBeenCalledTimes(2))
})

test('always offers the new project route', async () => {
  listProjects.mockResolvedValue([])

  render(<MemoryRouter><StudioProjectsPage /></MemoryRouter>)

  expect(screen.getByRole('link', { name: '新增案場' })).toHaveAttribute(
    'href',
    '/studio/projects/new',
  )
  await screen.findByText('目前還沒有案場。')
})
