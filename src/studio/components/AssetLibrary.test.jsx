import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import AssetLibrary from './AssetLibrary'

vi.mock('../api/assets', () => ({
  createAssetPreviewUrl: vi.fn(),
  listAssets: vi.fn(),
  updateAssetPermission: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({ supabase: { source: 'default-test' } }))

import {
  createAssetPreviewUrl,
  listAssets,
  updateAssetPermission,
} from '../api/assets'

const projectId = '11111111-1111-4111-8111-111111111111'
const firstAssetId = '22222222-2222-4222-8222-222222222222'
const secondAssetId = '33333333-3333-4333-8333-333333333333'

function assetRow(overrides = {}) {
  const id = overrides.id || firstAssetId
  return {
    id,
    project_id: projectId,
    storage_path: `raw/${projectId}/${id}.jpg`,
    original_name: '庭園入口.jpg',
    mime_type: 'image/jpeg',
    size_bytes: 1536,
    width: 1600,
    height: 900,
    permission_status: 'unconfirmed',
    privacy_flags: [],
    processing_status: 'ready',
    created_at: '2026-08-18T10:00:00.000Z',
    updated_at: '2026-08-18T10:00:00.000Z',
    ...overrides,
  }
}

function renderLibrary(props = {}) {
  return render(
    <AssetLibrary client={{ source: 'test' }} projectId={projectId} {...props} />,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  listAssets.mockResolvedValue([assetRow()])
  createAssetPreviewUrl.mockResolvedValue('https://signed.example/preview')
  updateAssetPermission.mockImplementation(async (_client, id, permissionStatus) => ({
    id,
    permission_status: permissionStatus,
    updated_at: '2026-08-18T11:00:00.000Z',
  }))
})

test('displays unconfirmed permission as 尚未確認', async () => {
  renderLibrary()

  const card = await screen.findByRole('article', { name: '庭園入口.jpg' })
  expect(within(card).getByText('尚未確認', { selector: 'strong' })).toBeInTheDocument()
  expect(within(card).getByRole('combobox', { name: '庭園入口.jpg 使用權限' }))
    .toHaveValue('unconfirmed')
})

test('displays forbidden permission as 不可用於生成', async () => {
  listAssets.mockResolvedValue([assetRow({ permission_status: 'forbidden' })])
  renderLibrary()

  const card = await screen.findByRole('article', { name: '庭園入口.jpg' })
  expect(within(card).getByText('不可用於生成', { selector: 'strong' })).toBeInTheDocument()
  expect(card).toHaveAttribute('data-permission', 'forbidden')
})

test('changes permission to needs_redaction through the asset API', async () => {
  const user = userEvent.setup()
  renderLibrary()
  const selector = await screen.findByRole('combobox', { name: '庭園入口.jpg 使用權限' })

  await user.selectOptions(selector, 'needs_redaction')

  expect(updateAssetPermission).toHaveBeenCalledWith(
    { source: 'test' },
    firstAssetId,
    'needs_redaction',
  )
  await waitFor(() => expect(selector).toHaveValue('needs_redaction'))
  expect(screen.getByText('需模糊', { selector: 'strong' })).toBeInTheDocument()
})

test.each([
  ['to forbidden', 'publishable', 'forbidden'],
  ['from forbidden', 'forbidden', 'publishable'],
])('requires confirmation when changing %s and cancellation keeps the old status', async (
  _name,
  oldStatus,
  nextStatus,
) => {
  const user = userEvent.setup()
  const confirm = vi.fn(() => false)
  listAssets.mockResolvedValue([assetRow({ permission_status: oldStatus })])
  renderLibrary({ confirm })
  const selector = await screen.findByRole('combobox', { name: '庭園入口.jpg 使用權限' })

  await user.selectOptions(selector, nextStatus)

  expect(confirm).toHaveBeenCalledOnce()
  expect(confirm.mock.calls[0][0]).toMatch(/生成/)
  expect(updateAssetPermission).not.toHaveBeenCalled()
  expect(selector).toHaveValue(oldStatus)
})

test('renders accessible loading, empty, and retryable list error states', async () => {
  let resolveList
  listAssets.mockReturnValueOnce(new Promise((resolve) => { resolveList = resolve }))
  const view = renderLibrary()

  expect(screen.getByRole('status')).toHaveTextContent('正在載入素材')
  resolveList([])
  expect(await screen.findByText('尚未上傳素材。')).toBeInTheDocument()

  listAssets.mockRejectedValueOnce(new Error('private database details'))
  view.rerender(
    <AssetLibrary
      client={{ source: 'test' }}
      projectId={projectId}
      refreshToken={1}
    />,
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('無法載入素材')
  expect(screen.queryByText('private database details')).not.toBeInTheDocument()

  listAssets.mockResolvedValueOnce([])
  await userEvent.setup().click(screen.getByRole('button', { name: '重新載入素材' }))
  expect(await screen.findByText('尚未上傳素材。')).toBeInTheDocument()
})

test('isolates preview failures per card and can request a fresh signed URL', async () => {
  const user = userEvent.setup()
  createAssetPreviewUrl
    .mockRejectedValueOnce(new Error('expired'))
    .mockResolvedValueOnce('https://signed.example/fresh')
  renderLibrary()

  expect(await screen.findByText('無法載入預覽。')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '重新載入 庭園入口.jpg 預覽' }))

  const image = await screen.findByRole('img', { name: '庭園入口.jpg 預覽' })
  expect(image).toHaveAttribute('src', 'https://signed.example/fresh')
  expect(createAssetPreviewUrl).toHaveBeenCalledTimes(2)
})

test('keeps permission unchanged and shows a safe per-card alert when update fails', async () => {
  const user = userEvent.setup()
  updateAssetPermission.mockRejectedValueOnce(new Error('sensitive details'))
  renderLibrary()
  const selector = await screen.findByRole('combobox', { name: '庭園入口.jpg 使用權限' })

  await user.selectOptions(selector, 'publishable')

  expect(await screen.findByRole('alert')).toHaveTextContent('無法更新使用權限')
  expect(screen.queryByText('sensitive details')).not.toBeInTheDocument()
  expect(selector).toHaveValue('unconfirmed')
})

test('renders privacy flags as text and marks quarantined processing clearly', async () => {
  listAssets.mockResolvedValue([assetRow({
    privacy_flags: ['門牌', '', null, '<img src=x onerror=alert(1)>'],
    processing_status: 'quarantined',
  })])
  renderLibrary()

  const card = await screen.findByRole('article', { name: '庭園入口.jpg' })
  expect(within(card).getByText('門牌')).toBeInTheDocument()
  expect(within(card).getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  expect(within(card).getByText('已隔離（不可使用）')).toBeInTheDocument()
  expect(card).toHaveAttribute('data-processing', 'quarantined')
})

test('suppresses stale list results after the project changes', async () => {
  let resolveFirst
  listAssets
    .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
    .mockResolvedValueOnce([assetRow({
      id: secondAssetId,
      project_id: '44444444-4444-4444-8444-444444444444',
      storage_path: `raw/44444444-4444-4444-8444-444444444444/${secondAssetId}.jpg`,
      original_name: '新案場.jpg',
    })])
  const view = renderLibrary()

  view.rerender(
    <AssetLibrary
      client={{ source: 'test' }}
      projectId="44444444-4444-4444-8444-444444444444"
    />,
  )
  expect(await screen.findByRole('article', { name: '新案場.jpg' })).toBeInTheDocument()
  resolveFirst([assetRow({ original_name: '舊案場.jpg' })])
  await Promise.resolve()

  expect(screen.queryByRole('article', { name: '舊案場.jpg' })).not.toBeInTheDocument()
  expect(screen.getByRole('article', { name: '新案場.jpg' })).toBeInTheDocument()
})
