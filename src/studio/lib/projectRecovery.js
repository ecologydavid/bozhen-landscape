import { projectFactsSchema } from '../schemas/project'

const createProjectIdKey = 'studio:create-project-id'
const factAttemptKeyPrefix = 'studio:fact-attempt:'

function sessionStorageOrNull() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function createAndStoreProjectId(createUuid, storage) {
  const projectId = createUuid()
  try {
    storage?.setItem(createProjectIdKey, projectId)
  } catch {
    // The mounted editor still retains this ID when session storage is unavailable.
  }
  return projectId
}

export function getOrCreateCreateProjectId(
  createUuid = () => globalThis.crypto.randomUUID(),
  storage = sessionStorageOrNull(),
) {
  try {
    const existingId = storage?.getItem(createProjectIdKey)
    if (isUuid(existingId || '')) return existingId
  } catch {
    // Replace unreadable state with a fresh in-memory flow ID.
  }
  return createAndStoreProjectId(createUuid, storage)
}

export function replaceCreateProjectId(
  createUuid = () => globalThis.crypto.randomUUID(),
  storage = sessionStorageOrNull(),
) {
  return createAndStoreProjectId(createUuid, storage)
}

export function clearCreateProjectId(storage = sessionStorageOrNull()) {
  try {
    storage?.removeItem(createProjectIdKey)
  } catch {
    // Database success remains authoritative when storage is unavailable.
  }
}

function factAttemptKey(projectId) {
  return `${factAttemptKeyPrefix}${projectId}`
}

export function clearFactAttempt(projectId, storage = sessionStorageOrNull()) {
  try {
    storage?.removeItem(factAttemptKey(projectId))
  } catch {
    // Database confirmation remains authoritative when storage is unavailable.
  }
}

export function readFactAttempt(projectId, storage = sessionStorageOrNull()) {
  try {
    const rawAttempt = storage?.getItem(factAttemptKey(projectId))
    if (!rawAttempt) return null
    const attempt = JSON.parse(rawAttempt)
    const parsedFacts = projectFactsSchema.safeParse(attempt?.facts)
    const baselineIsValid = attempt?.baselineVersion === null
      || (Number.isInteger(attempt?.baselineVersion) && attempt.baselineVersion >= 1)
    if (!parsedFacts.success || !baselineIsValid) {
      clearFactAttempt(projectId, storage)
      return null
    }
    return { facts: parsedFacts.data, baselineVersion: attempt.baselineVersion }
  } catch {
    clearFactAttempt(projectId, storage)
    return null
  }
}

// Client reconciliation reduces lost-response retries but cannot make an in-flight RPC
// exactly-once. Task 5B must deduplicate content under the RPC advisory lock.
export function writeFactAttempt(
  projectId,
  facts,
  baselineVersion,
  storage = sessionStorageOrNull(),
) {
  const normalizedFacts = projectFactsSchema.parse(facts)
  try {
    storage?.setItem(
      factAttemptKey(projectId),
      JSON.stringify({ facts: normalizedFacts, baselineVersion }),
    )
  } catch {
    // The immediate save remains usable but cannot be reconciled across a refresh.
  }
  return { facts: normalizedFacts, baselineVersion }
}

export function normalizedFactsEqual(left, right) {
  const leftResult = projectFactsSchema.safeParse(left)
  const rightResult = projectFactsSchema.safeParse(right)
  return leftResult.success
    && rightResult.success
    && JSON.stringify(leftResult.data) === JSON.stringify(rightResult.data)
}

function isNewerMatchingVersion(currentFacts, attempt) {
  const baseline = attempt.baselineVersion ?? 0
  return Number.isInteger(currentFacts?.version)
    && currentFacts.version > baseline
    && normalizedFactsEqual(currentFacts.facts, attempt.facts)
}

export function recoverLoadedFactAttempt(
  projectId,
  currentFacts,
  storage = sessionStorageOrNull(),
) {
  const attempt = readFactAttempt(projectId, storage)
  if (!attempt) {
    return {
      status: 'none',
      facts: currentFacts?.facts,
      baselineVersion: currentFacts?.version ?? null,
      version: currentFacts?.version ?? null,
    }
  }

  if (isNewerMatchingVersion(currentFacts, attempt)) {
    clearFactAttempt(projectId, storage)
    return {
      status: 'committed',
      facts: currentFacts.facts,
      baselineVersion: attempt.baselineVersion,
      version: currentFacts.version,
    }
  }

  return {
    status: 'pending',
    facts: attempt.facts,
    baselineVersion: attempt.baselineVersion,
    version: currentFacts?.version ?? null,
  }
}

export function reconcileFactAttempt(
  projectId,
  currentFacts,
  desiredFacts,
  fallbackBaseline,
  storage = sessionStorageOrNull(),
) {
  const attempt = readFactAttempt(projectId, storage)
  if (!attempt) return { status: 'retry', baselineVersion: fallbackBaseline }

  if (isNewerMatchingVersion(currentFacts, attempt)) {
    clearFactAttempt(projectId, storage)
    if (normalizedFactsEqual(attempt.facts, desiredFacts)) {
      return { status: 'confirmed', currentFacts }
    }
    return { status: 'retry', baselineVersion: currentFacts.version }
  }

  if (normalizedFactsEqual(attempt.facts, desiredFacts)) {
    return { status: 'retry', baselineVersion: attempt.baselineVersion }
  }
  return {
    status: 'retry',
    baselineVersion: Number.isInteger(currentFacts?.version)
      ? currentFacts.version
      : fallbackBaseline,
  }
}
