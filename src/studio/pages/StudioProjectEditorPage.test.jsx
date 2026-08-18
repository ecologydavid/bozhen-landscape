import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import StudioProjectEditorPage from './StudioProjectEditorPage'

vi.mock('../api/projects', () => ({
  createProject: vi.fn(),
  getCurrentFacts: vi.fn(),
  getProject: vi.fn(),
  saveFactVersion: vi.fn(),
  updateProject: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({ supabase: { source: 'test' } }))

import {
  createProject,
  getCurrentFacts,
  getProject,
  saveFactVersion,
  updateProject,
} from '../api/projects'

const projectRow = {
  id: 'p1',
  internal_name: '二林企業廠區',
  public_name: '中部企業廠區景觀',
  region: '彰化',
  audience: 'corporate',
  site_type: '企業廠區',
  status: 'ready',
}

const factRow = {
  id: 'f1',
  project_id: 'p1',
  version: 1,
  is_current: true,
  facts: {
    clientNeed: '改善入口動線與企業門面。',
    services: ['景觀規劃', '植栽配置'],
    constraints: ['施工期間維持通行'],
    approach: ['分區施工'],
    verifiedMaterials: ['天然石材'],
    results: ['完成入口景觀整理'],
    publicCta: '歡迎洽詢景觀規劃',
    forbiddenDetails: ['客戶姓名'],
  },
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={['/studio/projects/p1']}>
      <Routes>
        <Route path="/studio/projects/:projectId" element={<StudioProjectEditorPage mode="edit" />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillCreateForm(user) {
  await user.type(screen.getByLabelText('內部名稱'), '二林企業廠區')
  await user.type(screen.getByLabelText('公開名稱'), '中部企業廠區景觀')
  await user.type(screen.getByLabelText('地區'), '彰化')
  await user.selectOptions(screen.getByLabelText('受眾'), 'builder')
  await user.type(screen.getByLabelText('場域類型'), '企業廠區')
  await user.type(screen.getByLabelText('客戶需求'), '改善入口動線與企業門面。')
  await user.type(screen.getByLabelText('已確認服務 1'), '景觀規劃')
  await user.type(screen.getByLabelText('執行方式 1'), '分區施工')
  await user.type(screen.getByLabelText('已確認成果 1'), '完成入口景觀整理')
  await user.type(screen.getByLabelText('公開行動呼籲'), '歡迎洽詢景觀規劃')
}

beforeEach(() => {
  vi.resetAllMocks()
})

test('does not save an incomplete fact card', async () => {
  const user = userEvent.setup()

  render(<MemoryRouter><StudioProjectEditorPage /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))

  expect(screen.getByText('至少填寫一項已確認服務')).toBeInTheDocument()
  expect(createProject).not.toHaveBeenCalled()
  expect(saveFactVersion).not.toHaveBeenCalled()
})

test('creates metadata before saving facts with the returned project id', async () => {
  const user = userEvent.setup()
  let resolveCreate
  createProject.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve }))
  saveFactVersion.mockResolvedValue({ id: 'f2', version: 2 })

  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)
  await fillCreateForm(user)
  const saveButton = screen.getByRole('button', { name: '儲存事實卡版本' })
  await user.click(saveButton)

  expect(createProject).toHaveBeenCalledWith(
    expect.anything(),
    {
      internalName: '二林企業廠區',
      publicName: '中部企業廠區景觀',
      region: '彰化',
      audience: 'builder',
      siteType: '企業廠區',
    },
  )
  expect(saveFactVersion).not.toHaveBeenCalled()
  expect(saveButton).toBeDisabled()

  resolveCreate({ ...projectRow, id: 'created-project' })

  expect(await screen.findByRole('status')).toHaveTextContent('已儲存事實卡版本 2')
  expect(saveFactVersion).toHaveBeenCalledWith(
    expect.anything(),
    'created-project',
    expect.objectContaining({
      services: ['景觀規劃'],
      approach: ['分區施工'],
      results: ['完成入口景觀整理'],
    }),
  )
})

test('loads an editable project and every current fact field', async () => {
  getProject.mockResolvedValue(projectRow)
  getCurrentFacts.mockResolvedValue(factRow)

  renderEdit()

  expect(screen.getByRole('status')).toHaveTextContent('正在載入案場…')
  expect(await screen.findByDisplayValue('二林企業廠區')).toBeInTheDocument()
  expect(screen.getByDisplayValue('中部企業廠區景觀')).toBeInTheDocument()
  expect(screen.getByDisplayValue('彰化')).toBeInTheDocument()
  expect(screen.getByLabelText('受眾')).toHaveValue('corporate')
  expect(screen.getByDisplayValue('企業廠區')).toBeInTheDocument()
  expect(screen.getByDisplayValue('改善入口動線與企業門面。')).toBeInTheDocument()
  expect(screen.getByDisplayValue('景觀規劃')).toBeInTheDocument()
  expect(screen.getByDisplayValue('植栽配置')).toBeInTheDocument()
  expect(screen.getByDisplayValue('施工期間維持通行')).toBeInTheDocument()
  expect(screen.getByDisplayValue('分區施工')).toBeInTheDocument()
  expect(screen.getByDisplayValue('天然石材')).toBeInTheDocument()
  expect(screen.getByDisplayValue('完成入口景觀整理')).toBeInTheDocument()
  expect(screen.getByDisplayValue('歡迎洽詢景觀規劃')).toBeInTheDocument()
  expect(screen.getByDisplayValue('客戶姓名')).toBeInTheDocument()
  expect(screen.getByText('目前版本 1')).toBeInTheDocument()
})

test('updates metadata before saving a new fact version', async () => {
  const user = userEvent.setup()
  let resolveUpdate
  getProject.mockResolvedValue(projectRow)
  getCurrentFacts.mockResolvedValue(factRow)
  updateProject.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve }))
  saveFactVersion.mockResolvedValue({ id: 'f2', version: 2 })
  renderEdit()

  const publicName = await screen.findByLabelText('公開名稱')
  await user.clear(publicName)
  await user.type(publicName, '更新後公開名稱')
  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))

  expect(updateProject).toHaveBeenCalledWith(
    expect.anything(),
    'p1',
    expect.objectContaining({ publicName: '更新後公開名稱' }),
  )
  expect(saveFactVersion).not.toHaveBeenCalled()

  resolveUpdate({ ...projectRow, public_name: '更新後公開名稱' })

  expect(await screen.findByText('已儲存事實卡版本 2')).toBeInTheDocument()
  expect(saveFactVersion).toHaveBeenCalledWith(
    expect.anything(),
    'p1',
    factRow.facts,
  )
})

test('distinguishes a missing project from a load failure', async () => {
  getProject.mockResolvedValue(null)
  getCurrentFacts.mockResolvedValue(null)

  renderEdit()

  expect(await screen.findByRole('alert')).toHaveTextContent('找不到這個案場。')
  expect(screen.getByRole('link', { name: '返回案場列表' })).toHaveAttribute(
    'href',
    '/studio/projects',
  )
})

test('retries a safe load error without exposing repository details', async () => {
  const user = userEvent.setup()
  getProject
    .mockRejectedValueOnce(new Error('credential leak'))
    .mockResolvedValueOnce(projectRow)
  getCurrentFacts
    .mockRejectedValueOnce(new Error('credential leak'))
    .mockResolvedValueOnce(factRow)

  renderEdit()

  expect(await screen.findByRole('alert')).toHaveTextContent('無法載入案場，請再試一次。')
  expect(screen.queryByText(/credential leak/)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '重新載入' }))

  expect(await screen.findByDisplayValue('二林企業廠區')).toBeInTheDocument()
  expect(getProject).toHaveBeenCalledTimes(2)
  expect(getCurrentFacts).toHaveBeenCalledTimes(2)
})

test('preserves typed values after metadata save fails and allows retry', async () => {
  const user = userEvent.setup()
  createProject
    .mockRejectedValueOnce(new Error('database details'))
    .mockResolvedValueOnce({ ...projectRow, id: 'created-project' })
  saveFactVersion.mockResolvedValue({ id: 'f1', version: 1 })
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)
  await fillCreateForm(user)

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('無法儲存案場資料，請再試一次。')
  expect(screen.queryByText(/database details/)).not.toBeInTheDocument()
  expect(screen.getByLabelText('公開名稱')).toHaveValue('中部企業廠區景觀')
  expect(screen.getByLabelText('已確認服務 1')).toHaveValue('景觀規劃')

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  expect(await screen.findByText('已儲存事實卡版本 1')).toBeInTheDocument()
  expect(createProject).toHaveBeenCalledTimes(2)
  expect(saveFactVersion).toHaveBeenCalledTimes(1)
})

test('reports a partial save honestly and retries facts without losing values', async () => {
  const user = userEvent.setup()
  createProject.mockResolvedValue({ ...projectRow, id: 'created-project' })
  saveFactVersion
    .mockRejectedValueOnce(new Error('rpc detail'))
    .mockResolvedValueOnce({ id: 'f1', version: 1 })
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)
  await fillCreateForm(user)

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    '案場資料已儲存，但事實卡版本儲存失敗，請再試一次。',
  )
  expect(screen.getByLabelText('公開名稱')).toHaveValue('中部企業廠區景觀')

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  expect(await screen.findByText('已儲存事實卡版本 1')).toBeInTheDocument()
  expect(saveFactVersion).toHaveBeenLastCalledWith(
    expect.anything(),
    'created-project',
    expect.objectContaining({ services: ['景觀規劃'] }),
  )
})

test('adds, edits, and removes array rows without changing their siblings', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)

  await user.type(screen.getByLabelText('已確認服務 1'), '景觀規劃')
  await user.click(screen.getByRole('button', { name: '新增已確認服務' }))
  await user.type(screen.getByLabelText('已確認服務 2'), '植栽配置')
  await user.click(screen.getByRole('button', { name: '新增已確認服務' }))
  await user.type(screen.getByLabelText('已確認服務 3'), '水景施作')
  await user.click(screen.getByRole('button', { name: '移除已確認服務 2' }))

  const services = within(screen.getByRole('group', { name: '已確認服務' }))
  expect(services.getByLabelText('已確認服務 1')).toHaveValue('景觀規劃')
  expect(services.getByLabelText('已確認服務 2')).toHaveValue('水景施作')
  expect(services.queryByDisplayValue('植栽配置')).not.toBeInTheDocument()
})

test('keeps the only array row available instead of silently removing typed input', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)

  const service = screen.getByLabelText('已確認服務 1')
  await user.type(service, '景觀規劃')

  expect(screen.queryByRole('button', { name: '移除已確認服務 1' })).not.toBeInTheDocument()
  expect(service).toHaveValue('景觀規劃')
})

test('associates every top-level label with a form control', () => {
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)

  for (const label of [
    '內部名稱', '公開名稱', '地區', '受眾', '場域類型', '客戶需求', '公開行動呼籲',
  ]) {
    expect(screen.getByLabelText(label)).toBeInTheDocument()
  }
  expect(screen.getByRole('link', { name: '取消並返回案場列表' })).toHaveAttribute(
    'href',
    '/studio/projects',
  )
})

test('prevents duplicate saves while a save is pending', async () => {
  const user = userEvent.setup()
  createProject.mockReturnValue(new Promise(() => {}))
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)
  await fillCreateForm(user)

  const saveButton = screen.getByRole('button', { name: '儲存事實卡版本' })
  await user.click(saveButton)
  expect(saveButton).toBeDisabled()
  expect(saveButton).toHaveTextContent('儲存中…')
  await user.click(saveButton)

  expect(createProject).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(saveFactVersion).not.toHaveBeenCalled())
})
