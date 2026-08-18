import { projectFactsSchema, projectInputSchema } from '../schemas/project'

const projectFields = 'id, internal_name, public_name, region, audience, site_type, status, created_at, updated_at'
const factFields = 'id, project_id, version, facts, is_current, created_by, created_at'

function toProjectRow(input) {
  return {
    internal_name: input.internalName,
    public_name: input.publicName,
    region: input.region,
    audience: input.audience,
    site_type: input.siteType,
  }
}

export async function listProjects(client) {
  const { data, error } = await client
    .from('studio_projects')
    .select(projectFields)

  if (error) throw error
  return data
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

export async function createProject(client, input) {
  const parsedInput = projectInputSchema.parse(input)
  const { data, error } = await client
    .from('studio_projects')
    .insert(toProjectRow(parsedInput))
    .select(projectFields)
    .single()

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
  const { data, error } = await client.rpc('studio_save_fact_version', {
    target_project_id: projectId,
    next_facts: parsedFacts,
  })

  if (error) throw error
  return data
}
