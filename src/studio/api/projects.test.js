import { expect, test, vi } from 'vitest'
import {
  createProject,
  getCurrentFacts,
  getProject,
  listProjects,
  saveFactVersion,
  updateProject,
} from './projects'

const projectFields = 'id, internal_name, public_name, region, audience, site_type, status, created_at, updated_at'
const factFields = 'id, project_id, version, facts, is_current, created_by, created_at'

const projectInput = {
  internalName: '二林企業廠區',
  publicName: '中部企業廠區景觀',
  region: '彰化',
  audience: 'builder',
  siteType: '企業廠區',
}

const factsInput = {
  clientNeed: '改善入口動線與企業門面。',
  services: ['景觀規劃'],
  constraints: ['施工期間維持通行'],
  approach: ['分區施工'],
  verifiedMaterials: ['天然石材'],
  results: ['完成入口景觀整理'],
  publicCta: '歡迎洽詢景觀規劃',
  forbiddenDetails: ['客戶姓名'],
}

function createSupabaseMock(result = { data: null, error: null }) {
  const query = {
    select: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  const client = {
    from: vi.fn(() => query),
    rpc: vi.fn(() => Promise.resolve(result)),
  }

  return { client, query }
}

test('lists projects using only the explicit Task 6 fields', async () => {
  const rows = [{ id: 'project-1', internal_name: '二林企業廠區' }]
  const { client, query } = createSupabaseMock({ data: rows, error: null })

  await expect(listProjects(client)).resolves.toBe(rows)
  expect(client.from).toHaveBeenCalledWith('projects')
  expect(query.select).toHaveBeenCalledOnce()
  expect(query.select).toHaveBeenCalledWith(projectFields)
  expect(query.select).not.toHaveBeenCalledWith('*')
})

test('gets one project by id with an explicit field list', async () => {
  const row = { id: 'project-1', internal_name: '二林企業廠區' }
  const { client, query } = createSupabaseMock({ data: row, error: null })

  await expect(getProject(client, 'project-1')).resolves.toBe(row)
  expect(query.select).toHaveBeenCalledWith(projectFields)
  expect(query.eq).toHaveBeenCalledWith('id', 'project-1')
  expect(query.maybeSingle).toHaveBeenCalledOnce()
})

test('creates a project from validated camelCase input using exact database fields', async () => {
  const row = { id: 'project-1' }
  const { client, query } = createSupabaseMock({ data: row, error: null })

  await expect(createProject(client, {
    ...projectInput,
    internalName: '  二林企業廠區  ',
    status: 'published',
    id: 'caller-controlled',
  })).resolves.toBe(row)
  expect(query.insert).toHaveBeenCalledWith({
    internal_name: '二林企業廠區',
    public_name: '中部企業廠區景觀',
    region: '彰化',
    audience: 'builder',
    site_type: '企業廠區',
  })
  expect(query.select).toHaveBeenCalledWith(projectFields)
  expect(query.single).toHaveBeenCalledOnce()
})

test('updates a project from validated camelCase input using exact database fields', async () => {
  const row = { id: 'project-1' }
  const { client, query } = createSupabaseMock({ data: row, error: null })

  await expect(updateProject(client, 'project-1', {
    ...projectInput,
    publicName: '  中部企業廠區景觀  ',
    updatedAt: 'caller-controlled',
  })).resolves.toBe(row)
  expect(query.update).toHaveBeenCalledWith({
    internal_name: '二林企業廠區',
    public_name: '中部企業廠區景觀',
    region: '彰化',
    audience: 'builder',
    site_type: '企業廠區',
  })
  expect(query.eq).toHaveBeenCalledWith('id', 'project-1')
  expect(query.select).toHaveBeenCalledWith(projectFields)
  expect(query.single).toHaveBeenCalledOnce()
})

test('validates project input before create and update queries', async () => {
  const createMock = createSupabaseMock()
  const updateMock = createSupabaseMock()

  await expect(createProject(createMock.client, {
    ...projectInput,
    audience: 'residential',
  })).rejects.toThrow(/audience/)
  await expect(updateProject(updateMock.client, 'project-1', {
    ...projectInput,
    internalName: '甲',
  })).rejects.toThrow(/internalName/)
  expect(createMock.client.from).not.toHaveBeenCalled()
  expect(updateMock.client.from).not.toHaveBeenCalled()
})

test('gets the current fact version with explicit project and current filters', async () => {
  const row = { id: 'facts-1', project_id: 'project-1', is_current: true }
  const { client, query } = createSupabaseMock({ data: row, error: null })

  await expect(getCurrentFacts(client, 'project-1')).resolves.toBe(row)
  expect(client.from).toHaveBeenCalledWith('project_fact_versions')
  expect(query.select).toHaveBeenCalledWith(factFields)
  expect(query.select).not.toHaveBeenCalledWith('*')
  expect(query.eq).toHaveBeenNthCalledWith(1, 'project_id', 'project-1')
  expect(query.eq).toHaveBeenNthCalledWith(2, 'is_current', true)
  expect(query.maybeSingle).toHaveBeenCalledOnce()
})

test('returns null safely when there is no current fact version', async () => {
  const { client } = createSupabaseMock({ data: null, error: null })

  await expect(getCurrentFacts(client, 'project-1')).resolves.toBeNull()
})

test('saves one parsed fact version through the fixed RPC contract', async () => {
  const saved = { id: 'facts-2', version: 2 }
  const { client } = createSupabaseMock({ data: saved, error: null })

  await expect(saveFactVersion(client, 'project-1', factsInput)).resolves.toBe(saved)
  expect(client.rpc).toHaveBeenCalledOnce()
  expect(client.rpc).toHaveBeenCalledWith('studio_save_fact_version', {
    target_project_id: 'project-1',
    next_facts: factsInput,
  })
})

test('parses facts before calling the save RPC', async () => {
  const { client } = createSupabaseMock()

  await expect(saveFactVersion(client, 'project-1', {
    ...factsInput,
    services: [],
  })).rejects.toThrow(/services/)
  expect(client.rpc).not.toHaveBeenCalled()
})

test.each([
  ['listProjects', (client) => listProjects(client)],
  ['getProject', (client) => getProject(client, 'project-1')],
  ['createProject', (client) => createProject(client, projectInput)],
  ['updateProject', (client) => updateProject(client, 'project-1', projectInput)],
  ['getCurrentFacts', (client) => getCurrentFacts(client, 'project-1')],
  ['saveFactVersion', (client) => saveFactVersion(client, 'project-1', factsInput)],
])('throws the Supabase error unchanged for %s', async (_name, operation) => {
  const error = new Error('Supabase unavailable')
  const { client } = createSupabaseMock({ data: null, error })

  await expect(operation(client)).rejects.toBe(error)
})
