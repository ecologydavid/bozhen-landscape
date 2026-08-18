import { expect, test } from 'vitest'
import { audiences, projectFactsSchema, projectInputSchema } from './project'

const validProject = {
  internalName: '二林企業廠區',
  publicName: '中部企業廠區景觀',
  region: '彰化',
  audience: 'builder',
  siteType: '企業廠區',
}

const validFacts = {
  clientNeed: '改善入口動線與企業門面。',
  services: ['景觀規劃'],
  constraints: ['施工期間維持通行'],
  approach: ['分區施工'],
  verifiedMaterials: ['天然石材'],
  results: ['完成入口景觀整理'],
  publicCta: '歡迎洽詢景觀規劃',
  forbiddenDetails: ['客戶姓名'],
}

const projectStringBoundaries = [
  ['internalName', 2, 120],
  ['publicName', 2, 120],
  ['region', 2, 80],
  ['siteType', 2, 80],
]

const factStringBoundaries = [
  ['clientNeed', 10, 800],
  ['publicCta', 2, 160],
]

const factItemBoundaries = [
  ['services', 2, 100],
  ['constraints', 2, 240],
  ['approach', 2, 240],
  ['verifiedMaterials', 2, 120],
  ['results', 2, 240],
  ['forbiddenDetails', 2, 240],
]

test('accepts a complete builder project', () => {
  expect(projectInputSchema.parse({
    internalName: '二林企業廠區', publicName: '中部企業廠區景觀',
    region: '彰化', audience: 'builder', siteType: '企業廠區',
  }).audience).toBe('builder')
})

test.each(['builder', 'corporate', 'luxury_home'])(
  'supports the %s audience',
  (audience) => {
    const project = projectInputSchema.parse({
      internalName: '二林企業廠區',
      publicName: '中部企業廠區景觀',
      region: '彰化',
      audience,
      siteType: '企業廠區',
    })

    expect(project.audience).toBe(audience)
  },
)

test('exports the supported audiences and rejects an invalid audience', () => {
  expect(audiences).toEqual(['builder', 'corporate', 'luxury_home'])
  expect(() => projectInputSchema.parse({
    internalName: '二林企業廠區',
    publicName: '中部企業廠區景觀',
    region: '彰化',
    audience: 'residential',
    siteType: '企業廠區',
  })).toThrow()
})

test.each(projectStringBoundaries)(
  '%s accepts trimmed values at the exact %i and %i character boundaries',
  (field, minimum, maximum) => {
    for (const length of [minimum, maximum]) {
      const value = '景'.repeat(length)
      const project = projectInputSchema.parse({
        ...validProject,
        [field]: `  ${value}  `,
      })

      expect(project[field]).toBe(value)
    }
  },
)

test.each(projectStringBoundaries)(
  '%s rejects trimmed values below %i or above %i characters',
  (field, minimum, maximum) => {
    for (const length of [minimum - 1, maximum + 1]) {
      expect(() => projectInputSchema.parse({
        ...validProject,
        [field]: `  ${'景'.repeat(length)}  `,
      })).toThrow(new RegExp(field))
    }
  },
)

test('requires at least one verified service', () => {
  expect(() => projectFactsSchema.parse({
    clientNeed: '改善入口動線與企業門面。', services: [],
    constraints: ['施工期間維持通行'], approach: ['分區施工'],
    verifiedMaterials: [], results: ['完成入口景觀整理'],
    publicCta: '歡迎洽詢景觀規劃', forbiddenDetails: [],
  })).toThrow(/services/)
})

test.each(['services', 'approach', 'results'])(
  'requires at least one %s entry',
  (field) => {
    const facts = {
      clientNeed: '改善入口動線與企業門面。',
      services: ['景觀規劃'],
      constraints: ['施工期間維持通行'],
      approach: ['分區施工'],
      verifiedMaterials: ['天然石材'],
      results: ['完成入口景觀整理'],
      publicCta: '歡迎洽詢景觀規劃',
      forbiddenDetails: ['客戶姓名'],
      [field]: [],
    }

    expect(() => projectFactsSchema.parse(facts)).toThrow(new RegExp(field))
  },
)

test('allows empty non-required fact arrays', () => {
  const facts = projectFactsSchema.parse({
    ...validFacts,
    constraints: [],
    verifiedMaterials: [],
    forbiddenDetails: [],
  })

  expect(facts.constraints).toEqual([])
  expect(facts.verifiedMaterials).toEqual([])
  expect(facts.forbiddenDetails).toEqual([])
})

test.each(factStringBoundaries)(
  '%s accepts trimmed values at the exact %i and %i character boundaries',
  (field, minimum, maximum) => {
    for (const length of [minimum, maximum]) {
      const value = '景'.repeat(length)
      const facts = projectFactsSchema.parse({
        ...validFacts,
        [field]: `  ${value}  `,
      })

      expect(facts[field]).toBe(value)
    }
  },
)

test.each(factStringBoundaries)(
  '%s rejects trimmed values below %i or above %i characters',
  (field, minimum, maximum) => {
    for (const length of [minimum - 1, maximum + 1]) {
      expect(() => projectFactsSchema.parse({
        ...validFacts,
        [field]: `  ${'景'.repeat(length)}  `,
      })).toThrow(new RegExp(field))
    }
  },
)

test.each(factItemBoundaries)(
  '%s accepts trimmed items at the exact %i and %i character boundaries',
  (field, minimum, maximum) => {
    for (const length of [minimum, maximum]) {
      const value = '景'.repeat(length)
      const facts = projectFactsSchema.parse({
        ...validFacts,
        [field]: [`  ${value}  `],
      })

      expect(facts[field]).toEqual([value])
    }
  },
)

test.each(factItemBoundaries)(
  '%s rejects trimmed items below %i or above %i characters',
  (field, minimum, maximum) => {
    for (const length of [minimum - 1, maximum + 1]) {
      expect(() => projectFactsSchema.parse({
        ...validFacts,
        [field]: [`  ${'景'.repeat(length)}  `],
      })).toThrow(new RegExp(field))
    }
  },
)
