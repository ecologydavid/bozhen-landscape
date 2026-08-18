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
const projectListFields = `${projectFields}, studio_assets(count)`
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

function createListMock(result = { data: null, error: null }) {
  const select = vi.fn().mockResolvedValue(result)
  const client = { from: vi.fn(() => ({ select })) }

  return { client, select }
}

function createReadMock(result = { data: null, error: null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const filtered = { maybeSingle }
  const eq = vi.fn(() => filtered)
  filtered.eq = eq
  const select = vi.fn(() => ({ eq }))
  const client = { from: vi.fn(() => ({ select })) }

  return { client, select, eq, maybeSingle }
}

function createInsertMock(result = { data: null, error: null }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const client = { from: vi.fn(() => ({ insert })) }

  return { client, insert, select, single }
}

function createUpsertMock(result = { data: null, error: null }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ single }))
  const upsert = vi.fn(() => ({ select }))
  const client = { from: vi.fn(() => ({ upsert })) }

  return { client, upsert, select, single }
}

function createUpdateMock(result = { data: null, error: null }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  const client = { from: vi.fn(() => ({ update })) }

  return { client, update, eq, select, single }
}

function createRpcMock(result = { data: null, error: null }) {
  const single = vi.fn().mockResolvedValue(result)
  const rpc = vi.fn(() => ({ single }))
  const client = { rpc }

  return { client, rpc, single }
}

test('lists projects with a real normalized asset relationship count', async () => {
  const rows = [
    { id: 'project-1', internal_name: '二林企業廠區', studio_assets: [{ count: 3 }] },
    { id: 'project-2', internal_name: '住宅庭園', studio_assets: { count: '2' } },
    { id: 'project-3', internal_name: '空案場', studio_assets: [] },
  ]
  const { client, select } = createListMock({ data: rows, error: null })

  await expect(listProjects(client)).resolves.toEqual([
    { id: 'project-1', internal_name: '二林企業廠區', asset_count: 3 },
    { id: 'project-2', internal_name: '住宅庭園', asset_count: 2 },
    { id: 'project-3', internal_name: '空案場', asset_count: 0 },
  ])
  expect(client.from).toHaveBeenCalledWith('studio_projects')
  expect(select).toHaveBeenCalledOnce()
  expect(select).toHaveBeenCalledWith(projectListFields)
  expect(select).not.toHaveBeenCalledWith('*')
})

test('gets one project by id with an explicit field list', async () => {
  const row = { id: 'project-1', internal_name: '二林企業廠區' }
  const { client, select, eq, maybeSingle } = createReadMock({ data: row, error: null })

  await expect(getProject(client, 'project-1')).resolves.toBe(row)
  expect(client.from).toHaveBeenCalledWith('studio_projects')
  expect(select).toHaveBeenCalledWith(projectFields)
  expect(eq).toHaveBeenCalledWith('id', 'project-1')
  expect(maybeSingle).toHaveBeenCalledOnce()
})

test('creates a project from validated camelCase input using exact database fields', async () => {
  const row = { id: 'project-1' }
  const { client, insert, select, single } = createInsertMock({ data: row, error: null })

  await expect(createProject(client, {
    ...projectInput,
    internalName: '  二林企業廠區  ',
    status: 'published',
    id: 'caller-controlled',
  })).resolves.toBe(row)
  expect(client.from).toHaveBeenCalledWith('studio_projects')
  expect(insert).toHaveBeenCalledWith({
    internal_name: '二林企業廠區',
    public_name: '中部企業廠區景觀',
    region: '彰化',
    audience: 'builder',
    site_type: '企業廠區',
  })
  expect(select).toHaveBeenCalledWith(projectFields)
  expect(single).toHaveBeenCalledOnce()
})

test('idempotently upserts a create flow with a separately validated client UUID', async () => {
  const projectId = '11111111-1111-4111-8111-111111111111'
  const row = { id: projectId }
  const { client, upsert, select, single } = createUpsertMock({ data: row, error: null })

  await expect(createProject(client, projectInput, { projectId })).resolves.toBe(row)
  expect(upsert).toHaveBeenCalledWith(
    {
      id: projectId,
      internal_name: '二林企業廠區',
      public_name: '中部企業廠區景觀',
      region: '彰化',
      audience: 'builder',
      site_type: '企業廠區',
    },
    { onConflict: 'id' },
  )
  expect(select).toHaveBeenCalledWith(projectFields)
  expect(single).toHaveBeenCalledOnce()
})

test('rejects an invalid create flow id before querying Supabase', async () => {
  const { client, upsert } = createUpsertMock()

  await expect(createProject(client, projectInput, { projectId: 'caller-id' }))
    .rejects.toThrow(/projectId/)
  expect(client.from).not.toHaveBeenCalled()
  expect(upsert).not.toHaveBeenCalled()
})

test('updates a project from validated camelCase input using exact database fields', async () => {
  const row = { id: 'project-1' }
  const { client, update, eq, select, single } = createUpdateMock({ data: row, error: null })

  await expect(updateProject(client, 'project-1', {
    ...projectInput,
    publicName: '  中部企業廠區景觀  ',
    updatedAt: 'caller-controlled',
  })).resolves.toBe(row)
  expect(client.from).toHaveBeenCalledWith('studio_projects')
  expect(update).toHaveBeenCalledWith({
    internal_name: '二林企業廠區',
    public_name: '中部企業廠區景觀',
    region: '彰化',
    audience: 'builder',
    site_type: '企業廠區',
  })
  expect(eq).toHaveBeenCalledWith('id', 'project-1')
  expect(select).toHaveBeenCalledWith(projectFields)
  expect(single).toHaveBeenCalledOnce()
})

test('validates project input before create and update queries', async () => {
  const createMock = createInsertMock()
  const updateMock = createUpdateMock()

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
  const { client, select, eq, maybeSingle } = createReadMock({ data: row, error: null })

  await expect(getCurrentFacts(client, 'project-1')).resolves.toBe(row)
  expect(client.from).toHaveBeenCalledWith('studio_project_fact_versions')
  expect(select).toHaveBeenCalledWith(factFields)
  expect(select).not.toHaveBeenCalledWith('*')
  expect(eq).toHaveBeenNthCalledWith(1, 'project_id', 'project-1')
  expect(eq).toHaveBeenNthCalledWith(2, 'is_current', true)
  expect(maybeSingle).toHaveBeenCalledOnce()
})

test('returns null safely when there is no current fact version', async () => {
  const { client } = createReadMock({ data: null, error: null })

  await expect(getCurrentFacts(client, 'project-1')).resolves.toBeNull()
})

test('saves one parsed fact version through the RPC single-row contract', async () => {
  const saved = { id: 'facts-2', version: 2 }
  const { client, rpc, single } = createRpcMock({ data: saved, error: null })
  const paddedFacts = {
    clientNeed: `  ${factsInput.clientNeed}  `,
    services: ['  景觀規劃  '],
    constraints: ['  施工期間維持通行  '],
    approach: ['  分區施工  '],
    verifiedMaterials: ['  天然石材  '],
    results: ['  完成入口景觀整理  '],
    publicCta: `  ${factsInput.publicCta}  `,
    forbiddenDetails: ['  客戶姓名  '],
    unknownFact: 'must not reach the database',
  }

  await expect(saveFactVersion(client, 'project-1', paddedFacts)).resolves.toBe(saved)
  expect(rpc).toHaveBeenCalledOnce()
  expect(rpc).toHaveBeenCalledWith('studio_save_fact_version', {
    target_project_id: 'project-1',
    next_facts: factsInput,
  })
  expect(single).toHaveBeenCalledOnce()
})

test('parses facts before calling the save RPC', async () => {
  const { client, rpc, single } = createRpcMock()

  await expect(saveFactVersion(client, 'project-1', {
    ...factsInput,
    services: [],
  })).rejects.toThrow(/services/)
  expect(rpc).not.toHaveBeenCalled()
  expect(single).not.toHaveBeenCalled()
})

test.each([
  ['listProjects', createListMock, (client) => listProjects(client)],
  ['getProject', createReadMock, (client) => getProject(client, 'project-1')],
  ['createProject', createInsertMock, (client) => createProject(client, projectInput)],
  ['updateProject', createUpdateMock, (client) => updateProject(client, 'project-1', projectInput)],
  ['getCurrentFacts', createReadMock, (client) => getCurrentFacts(client, 'project-1')],
])('throws the Supabase error unchanged for %s', async (_name, createMock, operation) => {
  const error = new Error('Supabase unavailable')
  const { client } = createMock({ data: null, error })

  await expect(operation(client)).rejects.toBe(error)
})

test('throws the error from the RPC single-row result unchanged', async () => {
  const error = new Error('Supabase unavailable')
  const { client, single } = createRpcMock({ data: null, error })

  await expect(saveFactVersion(client, 'project-1', factsInput)).rejects.toBe(error)
  expect(single).toHaveBeenCalledOnce()
})
