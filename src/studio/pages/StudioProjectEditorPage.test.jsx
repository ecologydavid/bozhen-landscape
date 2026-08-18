import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
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

const createProjectId = '11111111-1111-4111-8111-111111111111'
const createProjectIdKey = 'studio:create-project-id'

const createFacts = {
  clientNeed: '改善入口動線與企業門面。',
  services: ['景觀規劃'],
  constraints: [],
  approach: ['分區施工'],
  verifiedMaterials: [],
  results: ['完成入口景觀整理'],
  publicCta: '歡迎洽詢景觀規劃',
  forbiddenDetails: [],
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function RouteControls() {
  const navigate = useNavigate()

  return (
    <nav aria-label="測試路由">
      <button type="button" onClick={() => navigate('/studio/projects/a')}>前往案場 A</button>
      <button type="button" onClick={() => navigate('/studio/projects/b')}>前往案場 B</button>
      <button type="button" onClick={() => navigate('/studio/projects/new')}>前往新增案場</button>
    </nav>
  )
}

function LocationProbe() {
  const { pathname } = useLocation()
  return <output aria-label="目前路徑">{pathname}</output>
}

function renderEditorRoutes(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <RouteControls />
      <LocationProbe />
      <Routes>
        <Route path="/studio/projects/new" element={<StudioProjectEditorPage mode="create" />} />
        <Route path="/studio/projects/:projectId" element={<StudioProjectEditorPage mode="edit" />} />
      </Routes>
    </MemoryRouter>,
  )
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
  window.sessionStorage.clear()
  window.sessionStorage.setItem(createProjectIdKey, createProjectId)
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
    { projectId: createProjectId },
  )
  expect(saveFactVersion).not.toHaveBeenCalled()
  expect(saveButton).toBeDisabled()

  resolveCreate({ ...projectRow, id: createProjectId })

  expect(await screen.findByRole('status')).toHaveTextContent('已儲存事實卡版本 2')
  expect(saveFactVersion).toHaveBeenCalledWith(
    expect.anything(),
    createProjectId,
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
    .mockResolvedValueOnce({ ...projectRow, id: createProjectId })
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
  createProject.mockResolvedValue({ ...projectRow, id: createProjectId })
  getCurrentFacts.mockResolvedValue(null)
  saveFactVersion
    .mockRejectedValueOnce(new Error('rpc detail'))
    .mockResolvedValueOnce({ id: 'f1', version: 1 })
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)
  await fillCreateForm(user)

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    '案場資料已儲存，但事實卡版本狀態尚待確認',
  )
  expect(screen.getByLabelText('公開名稱')).toHaveValue('中部企業廠區景觀')

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  expect(await screen.findByText('已儲存事實卡版本 1')).toBeInTheDocument()
  expect(saveFactVersion).toHaveBeenLastCalledWith(
    expect.anything(),
    createProjectId,
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
  expect(services.getByLabelText('已確認服務 2')).toHaveFocus()
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

test('shows precise accessible validation for an invalid service item', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)
  await fillCreateForm(user)
  const service = screen.getByLabelText('已確認服務 1')
  await user.clear(service)
  await user.type(service, '景')

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))

  expect(screen.getByRole('alert')).toHaveTextContent('請修正表單中的欄位')
  expect(screen.getByText('已確認服務每項至少需要 2 個字')).toBeInTheDocument()
  expect(screen.queryByText('至少填寫一項已確認服務')).not.toBeInTheDocument()
  expect(service).toHaveAttribute('aria-invalid', 'true')
  expect(service).toHaveAttribute('aria-describedby')
  expect(document.getElementById(service.getAttribute('aria-describedby'))).toHaveTextContent(
    '已確認服務每項至少需要 2 個字',
  )
  expect(service).toHaveFocus()
})

test('describes and focuses a metadata maximum violation', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)
  await fillCreateForm(user)
  const internalName = screen.getByLabelText('內部名稱')
  fireEvent.change(internalName, { target: { value: '景'.repeat(121) } })

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))

  const message = screen.getByText('內部名稱不可超過 120 個字')
  expect(internalName).toHaveAttribute('aria-invalid', 'true')
  expect(internalName).toHaveAttribute('aria-describedby', message.id)
  expect(internalName).toHaveFocus()
})

test('hides project A while project B is loading and ignores the late A load', async () => {
  const user = userEvent.setup()
  const projectB = deferred()
  const factsB = deferred()
  getProject.mockImplementation((_, id) => (
    id === 'a'
      ? Promise.resolve({ ...projectRow, id: 'a', internal_name: '案場 A 內部' })
      : projectB.promise
  ))
  getCurrentFacts.mockImplementation((_, id) => (
    id === 'a' ? Promise.resolve({ ...factRow, project_id: 'a' }) : factsB.promise
  ))
  renderEditorRoutes('/studio/projects/a')
  expect(await screen.findByDisplayValue('案場 A 內部')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '前往案場 B' }))

  expect(screen.getByText('正在載入案場…')).toBeInTheDocument()
  expect(screen.queryByDisplayValue('案場 A 內部')).not.toBeInTheDocument()
  await act(async () => {
    projectB.resolve({ ...projectRow, id: 'b', internal_name: '案場 B 內部' })
    factsB.resolve({ ...factRow, project_id: 'b' })
  })
  expect(await screen.findByDisplayValue('案場 B 內部')).toBeInTheDocument()
})

test('resets edit state when navigating from edit to create', async () => {
  const user = userEvent.setup()
  getProject.mockResolvedValue({ ...projectRow, id: 'a', internal_name: '案場 A 內部' })
  getCurrentFacts.mockResolvedValue({ ...factRow, project_id: 'a' })
  renderEditorRoutes('/studio/projects/a')
  expect(await screen.findByDisplayValue('案場 A 內部')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '前往新增案場' }))

  expect(screen.getByRole('heading', { name: '新增案場' })).toBeInTheDocument()
  expect(screen.getByLabelText('內部名稱')).toHaveValue('')
  expect(screen.getByLabelText('已確認服務 1')).toHaveValue('')
})

test('resets create state and waits for B when navigating from create to edit', async () => {
  const user = userEvent.setup()
  const projectB = deferred()
  const factsB = deferred()
  getProject.mockReturnValue(projectB.promise)
  getCurrentFacts.mockReturnValue(factsB.promise)
  renderEditorRoutes('/studio/projects/new')
  await user.type(screen.getByLabelText('內部名稱'), '尚未儲存的新案場')

  await user.click(screen.getByRole('button', { name: '前往案場 B' }))

  expect(screen.getByText('正在載入案場…')).toBeInTheDocument()
  expect(screen.queryByDisplayValue('尚未儲存的新案場')).not.toBeInTheDocument()
  await act(async () => {
    projectB.resolve({ ...projectRow, id: 'b', internal_name: '案場 B 內部' })
    factsB.resolve({ ...factRow, project_id: 'b' })
  })
  expect(await screen.findByDisplayValue('案場 B 內部')).toBeInTheDocument()
})

test('does not continue an A save after navigating to B', async () => {
  const user = userEvent.setup()
  const updateA = deferred()
  getProject.mockImplementation((_, id) => Promise.resolve({
    ...projectRow,
    id,
    internal_name: `案場 ${id.toUpperCase()} 內部`,
  }))
  getCurrentFacts.mockImplementation((_, id) => Promise.resolve({ ...factRow, project_id: id }))
  updateProject.mockReturnValue(updateA.promise)
  renderEditorRoutes('/studio/projects/a')
  await screen.findByDisplayValue('案場 A 內部')
  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))

  await user.click(screen.getByRole('button', { name: '前往案場 B' }))
  expect(await screen.findByDisplayValue('案場 B 內部')).toBeInTheDocument()
  await act(async () => updateA.resolve({ ...projectRow, id: 'a' }))

  expect(saveFactVersion).not.toHaveBeenCalled()
  expect(screen.queryByText(/已儲存事實卡版本/)).not.toBeInTheDocument()
})

test('reuses the same create UUID after a lost response and refresh', async () => {
  const user = userEvent.setup()
  createProject
    .mockRejectedValueOnce(new Error('lost response'))
    .mockResolvedValueOnce({ ...projectRow, id: createProjectId })
  saveFactVersion.mockResolvedValue({ ...factRow, project_id: createProjectId, version: 1 })
  const firstRender = render(
    <MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>,
  )
  await fillCreateForm(user)
  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('無法儲存案場資料')
  firstRender.unmount()

  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)
  await fillCreateForm(user)
  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  await screen.findByText('已儲存事實卡版本 1')

  expect(createProject).toHaveBeenCalledTimes(2)
  expect(createProject.mock.calls[0][2]).toEqual({ projectId: createProjectId })
  expect(createProject.mock.calls[1][2]).toEqual({ projectId: createProjectId })
  expect(window.sessionStorage.getItem(createProjectIdKey)).toBeNull()
})

test('reconciles a committed fact RPC response loss without creating another version', async () => {
  const user = userEvent.setup()
  createProject.mockResolvedValue({ ...projectRow, id: createProjectId })
  saveFactVersion.mockRejectedValue(new Error('transport lost'))
  getCurrentFacts.mockResolvedValue({
    ...factRow,
    project_id: createProjectId,
    version: 1,
    facts: createFacts,
  })
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)
  await fillCreateForm(user)

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))

  expect(await screen.findByText('已儲存事實卡版本 1')).toBeInTheDocument()
  expect(saveFactVersion).toHaveBeenCalledOnce()
  expect(window.sessionStorage.getItem(`studio:fact-attempt:${createProjectId}`)).toBeNull()
})

test('retries one noncommitted fact RPC after reconciling the pending attempt', async () => {
  const user = userEvent.setup()
  createProject.mockResolvedValue({ ...projectRow, id: createProjectId })
  saveFactVersion
    .mockRejectedValueOnce(new Error('not committed'))
    .mockResolvedValueOnce({ ...factRow, project_id: createProjectId, version: 1 })
  getCurrentFacts.mockResolvedValue(null)
  render(<MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>)
  await fillCreateForm(user)

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('事實卡版本狀態尚待確認')
  expect(saveFactVersion).toHaveBeenCalledOnce()

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  expect(await screen.findByText('已儲存事實卡版本 1')).toBeInTheDocument()
  expect(saveFactVersion).toHaveBeenCalledTimes(2)
})

test('navigates to the canonical edit URL after a complete create', async () => {
  const user = userEvent.setup()
  createProject.mockResolvedValue({ ...projectRow, id: createProjectId })
  saveFactVersion.mockResolvedValue({ ...factRow, project_id: createProjectId, version: 1 })
  getProject.mockResolvedValue({ ...projectRow, id: createProjectId })
  getCurrentFacts.mockResolvedValue({ ...factRow, project_id: createProjectId, version: 1 })
  renderEditorRoutes('/studio/projects/new')
  await fillCreateForm(user)

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))

  expect(await screen.findByLabelText('目前路徑')).toHaveTextContent(
    `/studio/projects/${createProjectId}`,
  )
  expect(await screen.findByText('目前版本 1')).toBeInTheDocument()
})

test('completes a create save after Strict Mode replays effects', async () => {
  const user = userEvent.setup()
  createProject.mockResolvedValue({ ...projectRow, id: createProjectId })
  saveFactVersion.mockResolvedValue({ ...factRow, project_id: createProjectId, version: 1 })
  render(
    <StrictMode>
      <MemoryRouter><StudioProjectEditorPage mode="create" /></MemoryRouter>
    </StrictMode>,
  )
  await fillCreateForm(user)

  await user.click(screen.getByRole('button', { name: '儲存事實卡版本' }))

  expect(await screen.findByText('已儲存事實卡版本 1')).toBeInTheDocument()
  expect(saveFactVersion).toHaveBeenCalledOnce()
})
