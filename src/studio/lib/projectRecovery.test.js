import { beforeEach, expect, test } from 'vitest'
import {
  clearCreateProjectId,
  getOrCreateCreateProjectId,
  normalizedFactsEqual,
  readFactAttempt,
  reconcileFactAttempt,
  recoverLoadedFactAttempt,
  replaceCreateProjectId,
  writeFactAttempt,
} from './projectRecovery'

const projectId = '11111111-1111-4111-8111-111111111111'
const replacementId = '22222222-2222-4222-8222-222222222222'
const facts = {
  clientNeed: '改善入口動線與企業門面。',
  services: ['景觀規劃'],
  constraints: [],
  approach: ['分區施工'],
  verifiedMaterials: [],
  results: ['完成入口景觀整理'],
  publicCta: '歡迎洽詢景觀規劃',
  forbiddenDetails: [],
}

beforeEach(() => {
  window.sessionStorage.clear()
})

test('reuses, replaces, and clears a validated create flow UUID', () => {
  expect(getOrCreateCreateProjectId(() => projectId)).toBe(projectId)
  expect(getOrCreateCreateProjectId(() => replacementId)).toBe(projectId)
  expect(replaceCreateProjectId(() => replacementId)).toBe(replacementId)
  expect(getOrCreateCreateProjectId(() => projectId)).toBe(replacementId)
  clearCreateProjectId()
  expect(window.sessionStorage.getItem('studio:create-project-id')).toBeNull()
})

test('parses normalized fact attempts fail-safe', () => {
  writeFactAttempt(projectId, { ...facts, services: ['  景觀規劃  '] }, 1)
  expect(readFactAttempt(projectId)).toEqual({ facts, baselineVersion: 1 })

  window.sessionStorage.setItem(`studio:fact-attempt:${projectId}`, '{invalid')
  expect(readFactAttempt(projectId)).toBeNull()
  expect(window.sessionStorage.getItem(`studio:fact-attempt:${projectId}`)).toBeNull()
})

test('restores pending attempted facts instead of older loaded facts', () => {
  writeFactAttempt(projectId, facts, 1)
  const olderFacts = { ...facts, services: ['舊服務'] }

  expect(recoverLoadedFactAttempt(projectId, { version: 1, facts: olderFacts })).toEqual({
    status: 'pending',
    facts,
    baselineVersion: 1,
    version: 1,
  })
  expect(readFactAttempt(projectId)).not.toBeNull()
})

test('confirms and clears an attempt only when a newer version has equal facts', () => {
  writeFactAttempt(projectId, facts, 1)

  expect(recoverLoadedFactAttempt(projectId, { version: 2, facts })).toEqual({
    status: 'committed',
    facts,
    baselineVersion: 1,
    version: 2,
  })
  expect(readFactAttempt(projectId)).toBeNull()
})

test('reconciles normalized facts against the stored baseline before retrying', () => {
  writeFactAttempt(projectId, { ...facts, services: ['  景觀規劃  '] }, 1)

  expect(normalizedFactsEqual(facts, { ...facts, services: ['景觀規劃'] })).toBe(true)
  expect(reconcileFactAttempt(
    projectId,
    { version: 1, facts: { ...facts, services: ['舊服務'] } },
    facts,
    9,
  )).toEqual({ status: 'retry', baselineVersion: 1 })
  expect(readFactAttempt(projectId)).toEqual({ facts, baselineVersion: 1 })
})
