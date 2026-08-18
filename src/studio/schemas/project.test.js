import { expect, test } from 'vitest'
import { audiences, projectFactsSchema, projectInputSchema } from './project'

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

test('trims project fields and enforces project field lengths', () => {
  const project = projectInputSchema.parse({
    internalName: '  二林企業廠區  ',
    publicName: '  中部企業廠區景觀  ',
    region: '  彰化  ',
    audience: 'corporate',
    siteType: '  企業廠區  ',
  })

  expect(project).toEqual({
    internalName: '二林企業廠區',
    publicName: '中部企業廠區景觀',
    region: '彰化',
    audience: 'corporate',
    siteType: '企業廠區',
  })
  expect(() => projectInputSchema.parse({
    ...project,
    internalName: '甲',
  })).toThrow(/internalName/)
  expect(() => projectInputSchema.parse({
    ...project,
    publicName: '景'.repeat(121),
  })).toThrow(/publicName/)
})

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

test('trims fact-card strings and enforces fact-card lengths', () => {
  const facts = projectFactsSchema.parse({
    clientNeed: '  改善入口動線與企業門面。  ',
    services: ['  景觀規劃  '],
    constraints: ['  施工期間維持通行  '],
    approach: ['  分區施工  '],
    verifiedMaterials: ['  天然石材  '],
    results: ['  完成入口景觀整理  '],
    publicCta: '  歡迎洽詢景觀規劃  ',
    forbiddenDetails: ['  客戶姓名  '],
  })

  expect(facts).toEqual({
    clientNeed: '改善入口動線與企業門面。',
    services: ['景觀規劃'],
    constraints: ['施工期間維持通行'],
    approach: ['分區施工'],
    verifiedMaterials: ['天然石材'],
    results: ['完成入口景觀整理'],
    publicCta: '歡迎洽詢景觀規劃',
    forbiddenDetails: ['客戶姓名'],
  })
  expect(() => projectFactsSchema.parse({
    ...facts,
    clientNeed: '過短需求',
  })).toThrow(/clientNeed/)
  expect(() => projectFactsSchema.parse({
    ...facts,
    services: ['服'.repeat(101)],
  })).toThrow(/services/)
})
