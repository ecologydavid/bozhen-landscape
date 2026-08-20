import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import AssetLibrary from './AssetLibrary'

vi.mock('../api/assets', () => ({
  AssetPermissionConflictError: class AssetPermissionConflictError extends Error {},
  createAssetPreviewUrl: vi.fn(),
  getAsset: vi.fn(),
  listAssets: vi.fn(),
  updateAssetPermission: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({ supabase: { source: 'default-test' } }))

import {
  AssetPermissionConflictError,
  createAssetPreviewUrl,
  getAsset,
  listAssets,
  updateAssetPermission,
} from '../api/assets'

const projectId = '11111111-1111-4111-8111-111111111111'
const firstAssetId = '22222222-2222-4222-8222-222222222222'
const secondAssetId = '33333333-3333-4333-8333-333333333333'
const thirdAssetId = '44444444-4444-4444-8444-444444444444'
const defaultClient = { source: 'test' }
let serverPermission

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

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
    <AssetLibrary client={defaultClient} projectId={projectId} {...props} />,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  listAssets.mockResolvedValue([assetRow()])
  createAssetPreviewUrl.mockResolvedValue('https://signed.example/preview')
  serverPermission = 'unconfirmed'
  updateAssetPermission.mockImplementation(async (_client, id, permissionStatus) => {
    serverPermission = permissionStatus
    return {
      id,
      permission_status: permissionStatus,
      updated_at: '2026-08-18T11:00:00.000Z',
    }
  })
  getAsset.mockImplementation(async (_client, id) => assetRow({
    id,
    permission_status: serverPermission,
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
    defaultClient,
    firstAssetId,
    'needs_redaction',
    {
      expectedUpdatedAt: '2026-08-18T10:00:00.000Z',
      expectedPermissionStatus: 'unconfirmed',
    },
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

test('recovers from a real image load failure by signing a fresh lazy preview', async () => {
  const user = userEvent.setup()
  createAssetPreviewUrl
    .mockResolvedValueOnce('https://signed.example/first')
    .mockResolvedValueOnce('https://signed.example/second')
  renderLibrary()

  const firstImage = await screen.findByRole('img', { name: '庭園入口.jpg 預覽' })
  expect(firstImage).toHaveAttribute('src', 'https://signed.example/first')
  expect(firstImage).toHaveAttribute('loading', 'lazy')
  expect(firstImage).toHaveAttribute('decoding', 'async')

  fireEvent.error(firstImage)
  expect(await screen.findByText('無法載入預覽。')).toBeInTheDocument()
  expect(screen.queryByRole('img', { name: '庭園入口.jpg 預覽' }))
    .not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '重新載入 庭園入口.jpg 預覽' }))
  expect(await screen.findByRole('img', { name: '庭園入口.jpg 預覽' }))
    .toHaveAttribute('src', 'https://signed.example/second')
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

test('loads bounded pages, appends without duplicates, and stops after a short page', async () => {
  const user = userEvent.setup()
  const second = assetRow({ id: secondAssetId, original_name: '水池.jpg' })
  const third = assetRow({ id: thirdAssetId, original_name: '步道.jpg' })
  listAssets.mockReset()
    .mockResolvedValueOnce([assetRow(), second])
    .mockResolvedValueOnce([second, third])
    .mockResolvedValueOnce([])
  renderLibrary({ pageSize: 2 })

  expect(await screen.findByRole('article', { name: '庭園入口.jpg' })).toBeInTheDocument()
  expect(listAssets).toHaveBeenNthCalledWith(1, defaultClient, projectId, {
    limit: 2,
    offset: 0,
  })

  await user.click(screen.getByRole('button', { name: '載入更多' }))
  expect(await screen.findByRole('article', { name: '步道.jpg' })).toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(3)
  expect(listAssets).toHaveBeenNthCalledWith(2, defaultClient, projectId, {
    limit: 2,
    offset: 2,
  })

  await user.click(screen.getByRole('button', { name: '載入更多' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: '載入更多' }))
    .not.toBeInTheDocument())
  expect(listAssets).toHaveBeenNthCalledWith(3, defaultClient, projectId, {
    limit: 2,
    offset: 4,
  })
})

test('bounds private preview signing concurrency to four and uses one aggregate status', async () => {
  const jobs = []
  let active = 0
  let maximum = 0
  const rows = Array.from({ length: 6 }, (_, index) => {
    const id = `asset-${index + 1}`
    return assetRow({ id, original_name: `素材 ${index + 1}.jpg` })
  })
  listAssets.mockResolvedValue(rows)
  createAssetPreviewUrl.mockImplementation(() => {
    const job = deferred()
    jobs.push(job)
    active += 1
    maximum = Math.max(maximum, active)
    return job.promise.finally(() => { active -= 1 })
  })
  const view = renderLibrary({ pageSize: 6 })

  await waitFor(() => expect(createAssetPreviewUrl).toHaveBeenCalledTimes(4))
  expect(maximum).toBe(4)
  expect(screen.getAllByRole('status')).toHaveLength(1)
  for (const card of screen.getAllByRole('article')) {
    expect(within(card).queryByRole('status')).not.toBeInTheDocument()
  }

  jobs[0].resolve('https://signed.example/one')
  await waitFor(() => expect(createAssetPreviewUrl).toHaveBeenCalledTimes(5))
  expect(maximum).toBe(4)
  jobs.slice(1).forEach((job, index) => job.resolve(`https://signed.example/${index + 2}`))
  await waitFor(() => expect(createAssetPreviewUrl).toHaveBeenCalledTimes(6))
  jobs[5].resolve('https://signed.example/six')
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  view.unmount()
})

test('prunes absent queued previews while old running jobs keep the shared four-slot limit', async () => {
  const oldRows = Array.from({ length: 6 }, (_, index) => assetRow({
    id: `old-${index + 1}`,
    original_name: `舊素材 ${index + 1}.jpg`,
    storage_path: `raw/${projectId}/old-${index + 1}.jpg`,
  }))
  const newRows = Array.from({ length: 2 }, (_, index) => assetRow({
    id: `new-${index + 1}`,
    original_name: `新素材 ${index + 1}.jpg`,
    storage_path: `raw/${projectId}/new-${index + 1}.jpg`,
  }))
  listAssets.mockReset()
    .mockResolvedValueOnce(oldRows)
    .mockResolvedValueOnce(newRows)
  const signingJobs = []
  let active = 0
  let maximum = 0
  createAssetPreviewUrl.mockImplementation((_client, path) => {
    const pending = deferred()
    const job = { path, pending }
    signingJobs.push(job)
    active += 1
    maximum = Math.max(maximum, active)
    return pending.promise.finally(() => { active -= 1 })
  })
  const view = renderLibrary({ pageSize: 6, refreshToken: 0 })

  await waitFor(() => expect(createAssetPreviewUrl).toHaveBeenCalledTimes(4))
  expect(signingJobs.map((job) => job.path)).toEqual(
    oldRows.slice(0, 4).map((row) => row.storage_path),
  )

  view.rerender(
    <AssetLibrary
      client={defaultClient}
      projectId={projectId}
      pageSize={6}
      refreshToken={1}
    />,
  )
  expect(await screen.findByRole('article', { name: '新素材 1.jpg' })).toBeInTheDocument()
  expect(screen.queryByRole('article', { name: '舊素材 1.jpg' })).not.toBeInTheDocument()
  expect(createAssetPreviewUrl).toHaveBeenCalledTimes(4)

  signingJobs[0].pending.resolve('https://signed.example/stale-old-1')
  await waitFor(() => expect(createAssetPreviewUrl).toHaveBeenCalledTimes(5))
  expect(signingJobs[4].path).toBe(newRows[0].storage_path)
  expect(maximum).toBe(4)
  expect(screen.queryByRole('img', { name: '新素材 1.jpg 預覽' }))
    .not.toBeInTheDocument()

  signingJobs[1].pending.resolve('https://signed.example/stale-old-2')
  await waitFor(() => expect(createAssetPreviewUrl).toHaveBeenCalledTimes(6))
  expect(signingJobs[5].path).toBe(newRows[1].storage_path)
  expect(maximum).toBe(4)
  signingJobs[2].pending.resolve('https://signed.example/stale-old-3')
  signingJobs[3].pending.resolve('https://signed.example/stale-old-4')
  signingJobs[4].pending.resolve('https://signed.example/new-1')
  signingJobs[5].pending.resolve('https://signed.example/new-2')

  expect(await screen.findByRole('img', { name: '新素材 1.jpg 預覽' }))
    .toHaveAttribute('src', 'https://signed.example/new-1')
  expect(screen.getByRole('img', { name: '新素材 2.jpg 預覽' }))
    .toHaveAttribute('src', 'https://signed.example/new-2')
  expect(signingJobs.map((job) => job.path)).not.toContain(oldRows[4].storage_path)
  expect(signingJobs.map((job) => job.path)).not.toContain(oldRows[5].storage_path)
  expect(screen.queryByText('https://signed.example/stale-old-1')).not.toBeInTheDocument()
  expect(maximum).toBe(4)
})

test('invalidates a ready preview when the same asset id points to a changed path', async () => {
  const changedPath = `raw/${projectId}/${firstAssetId}.png`
  listAssets.mockReset()
    .mockResolvedValueOnce([assetRow()])
    .mockResolvedValueOnce([assetRow({ storage_path: changedPath, mime_type: 'image/png' })])
  createAssetPreviewUrl.mockImplementation(async (_client, path) => (
    path === changedPath
      ? 'https://signed.example/current-path'
      : 'https://signed.example/old-path'
  ))
  const view = renderLibrary({ refreshToken: 0 })

  expect(await screen.findByRole('img', { name: '庭園入口.jpg 預覽' }))
    .toHaveAttribute('src', 'https://signed.example/old-path')
  view.rerender(
    <AssetLibrary client={defaultClient} projectId={projectId} refreshToken={1} />,
  )

  await waitFor(() => expect(createAssetPreviewUrl).toHaveBeenCalledTimes(2))
  expect(createAssetPreviewUrl).toHaveBeenLastCalledWith(defaultClient, changedPath)
  expect(await screen.findByRole('img', { name: '庭園入口.jpg 預覽' }))
    .toHaveAttribute('src', 'https://signed.example/current-path')
})

test('keeps a pending permission mutation authoritative across a same-project refresh', async () => {
  const user = userEvent.setup()
  const update = deferred()
  updateAssetPermission.mockReturnValue(update.promise)
  getAsset.mockResolvedValue(assetRow({
    permission_status: 'needs_redaction',
    updated_at: '2026-08-18T11:00:00.000Z',
  }))
  listAssets.mockResolvedValue([assetRow()])
  const view = renderLibrary({ refreshToken: 0 })
  const selector = await screen.findByRole('combobox', { name: '庭園入口.jpg 使用權限' })

  await user.selectOptions(selector, 'needs_redaction')
  expect(selector).toBeDisabled()
  view.rerender(
    <AssetLibrary client={defaultClient} projectId={projectId} refreshToken={1} />,
  )
  await waitFor(() => expect(listAssets).toHaveBeenCalledTimes(2))
  fireEvent.change(selector, { target: { value: 'publishable' } })
  expect(updateAssetPermission).toHaveBeenCalledOnce()

  update.resolve({
    id: firstAssetId,
    permission_status: 'needs_redaction',
    updated_at: '2026-08-18T11:00:00.000Z',
  })
  await waitFor(() => expect(selector).toHaveValue('needs_redaction'))
  expect(selector).not.toBeDisabled()
  expect(updateAssetPermission).toHaveBeenCalledOnce()
})

test('does not let a late stale refresh overwrite a completed permission mutation', async () => {
  const user = userEvent.setup()
  const staleRefresh = deferred()
  listAssets.mockReset()
    .mockResolvedValueOnce([assetRow()])
    .mockReturnValueOnce(staleRefresh.promise)
  const view = renderLibrary({ refreshToken: 0 })
  const selector = await screen.findByRole('combobox', { name: '庭園入口.jpg 使用權限' })

  view.rerender(
    <AssetLibrary client={defaultClient} projectId={projectId} refreshToken={1} />,
  )
  await waitFor(() => expect(listAssets).toHaveBeenCalledTimes(2))
  await user.selectOptions(selector, 'needs_redaction')
  await waitFor(() => expect(selector).toHaveValue('needs_redaction'))

  staleRefresh.resolve([assetRow()])
  await act(async () => { await staleRefresh.promise })
  expect(selector).toHaveValue('needs_redaction')
})

test('refetches a permission conflict and bases the next forbidden transition on server state', async () => {
  const user = userEvent.setup()
  const confirm = vi.fn(() => false)
  updateAssetPermission.mockRejectedValueOnce(new AssetPermissionConflictError())
  getAsset.mockResolvedValueOnce(assetRow({
    permission_status: 'forbidden',
    updated_at: '2026-08-18T12:00:00.000Z',
  }))
  renderLibrary({ confirm })
  const selector = await screen.findByRole('combobox', { name: '庭園入口.jpg 使用權限' })

  await user.selectOptions(selector, 'publishable')
  expect(await screen.findByRole('alert')).toHaveTextContent(
    '權限已被其他操作更新，請確認最新狀態後再試。',
  )
  expect(selector).toHaveValue('forbidden')

  await user.selectOptions(selector, 'publishable')
  expect(confirm).toHaveBeenCalledOnce()
  expect(updateAssetPermission).toHaveBeenCalledOnce()
  expect(selector).toHaveValue('forbidden')
})

test('suppresses StrictMode list completion after unmount', async () => {
  const pendingLists = []
  listAssets.mockImplementation(() => {
    const pending = deferred()
    pendingLists.push(pending)
    return pending.promise
  })
  const view = render(
    <StrictMode>
      <AssetLibrary client={defaultClient} projectId={projectId} />
    </StrictMode>,
  )
  await waitFor(() => expect(listAssets).toHaveBeenCalledTimes(2))

  view.unmount()
  await act(async () => {
    pendingLists.forEach((pending) => pending.resolve([assetRow()]))
    await Promise.all(pendingLists.map((pending) => pending.promise))
  })
  expect(createAssetPreviewUrl).not.toHaveBeenCalled()
})
