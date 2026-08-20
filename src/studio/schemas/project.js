import { z } from 'zod'

export const audiences = ['builder', 'corporate', 'luxury_home']
export const projectInputSchema = z.object({
  internalName: z.string().trim().min(2).max(120),
  publicName: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(80),
  audience: z.enum(audiences),
  siteType: z.string().trim().min(2).max(80),
})

export const projectFactsSchema = z.object({
  clientNeed: z.string().trim().min(10).max(800),
  services: z.array(z.string().trim().min(2).max(100)).min(1),
  constraints: z.array(z.string().trim().min(2).max(240)),
  approach: z.array(z.string().trim().min(2).max(240)).min(1),
  verifiedMaterials: z.array(z.string().trim().min(2).max(120)),
  results: z.array(z.string().trim().min(2).max(240)).min(1),
  publicCta: z.string().trim().min(2).max(160),
  forbiddenDetails: z.array(z.string().trim().min(2).max(240)),
})
