import { z } from 'zod'
import { projectFactsSchema, projectInputSchema } from '../schemas/project'

const projectFields = 'id, internal_name, public_name, region, audience, site_type, status, created_at, updated_at'
const projectListFields = `${projectFields}, studio_assets(count)`
const factFields = 'id, project_id, version, facts, is_current, created_by, created_at'
const createProjectOptionsSchema = z.object({
  projectId: z.uuid().optional(),
})

export class ProjectIdCollisionError extends Error {
  constructor() {
    super('The stored create project identifier belongs to different project metadata.')
    this.name = 'ProjectIdCollisionError'
    this.code = 'PROJECT_ID_COLLISION'
  }
}

function toProjectRow(input) {
  return {
    internal_name: input.internalName,
    public_name: input.publicName,
    region: input.region,
    audience: input.audience,
    site_type: input.siteType,
  }
}

function projectMetadataMatches(existingProject, projectRow) {
  return existingProject
    && Object.entries(projectRow).every(([field, value]) => existingProject[field] === value)
}

function isAmbiguousInsertError(error) {
  if (!error) return false
  if (error.code === '23505') return true
  if (error.code === '42501' || error.code === '23514') return false
  const status = Number(error.status ?? error.statusCode)
  return !Number.isFinite(status) || status === 0 || status >= 500
}

export async function listProjects(client) {
  const { data, error } = await client
    .from('studio_projects')
    .select(projectListFields)

  if (error) throw error
  return data.map(({ studio_assets: assets, ...project }) => {
    const rawCount = Array.isArray(assets) ? assets[0]?.count : assets?.count
    const count = Number(rawCount)

    return {
      ...project,
      asset_count: Number.isFinite(count) && count >= 0 ? count : 0,
    }
  })
}

export async function getProject(client, projectId) {
  const { data, error } = await client
    .from('studio_projects')
    .select(projectFields)
    .eq('id', projectId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createProject(client, input, options = {}) {
  const parsedInput = projectInputSchema.parse(input)
  const { projectId } = createProjectOptionsSchema.parse(options)
  const projectRow = toProjectRow(parsedInput)
  const query = client
    .from('studio_projects')
    .insert(projectId ? { id: projectId, ...projectRow } : projectRow)
  const { data, error } = await query
    .select(projectFields)
    .single()

  if (error && projectId && isAmbiguousInsertError(error)) {
    let existingProject
    try {
      existingProject = await getProject(client, projectId)
    } catch {
      throw error
    }
    if (projectMetadataMatches(existingProject, projectRow)) return existingProject
    if (existingProject) throw new ProjectIdCollisionError()
  }
  if (error) throw error
  return data
}

export async function updateProject(client, projectId, input) {
  const parsedInput = projectInputSchema.parse(input)
  const { data, error } = await client
    .from('studio_projects')
    .update(toProjectRow(parsedInput))
    .eq('id', projectId)
    .select(projectFields)
    .single()

  if (error) throw error
  return data
}

export async function getCurrentFacts(client, projectId) {
  const { data, error } = await client
    .from('studio_project_fact_versions')
    .select(factFields)
    .eq('project_id', projectId)
    .eq('is_current', true)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function saveFactVersion(client, projectId, facts) {
  const parsedFacts = projectFactsSchema.parse(facts)
  const { data, error } = await client
    .rpc('studio_save_fact_version', {
      target_project_id: projectId,
      next_facts: parsedFacts,
    })
    .single()

  if (error) throw error
  return data
}
