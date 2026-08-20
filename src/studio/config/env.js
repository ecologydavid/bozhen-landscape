import { z } from 'zod'

function isLegacyAnonKey(value) {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
    return false
  }

  try {
    const payloadSegment = value.split('.')[1]
    const normalized = payloadSegment.replaceAll('-', '+').replaceAll('_', '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded))
    return payload?.role === 'anon'
  } catch {
    return false
  }
}

function isBrowserSafeKey(value) {
  if (value.toLowerCase().includes('service_role')) {
    return false
  }

  return value.startsWith('sb_publishable_') || isLegacyAnonKey(value)
}

const studioEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).refine(
    isBrowserSafeKey,
    'Browser configuration must use a publishable key',
  ),
})

export function readStudioEnv(source = import.meta.env) {
  const parsed = studioEnvSchema.parse(source)
  return {
    supabaseUrl: parsed.VITE_SUPABASE_URL,
    supabasePublishableKey: parsed.VITE_SUPABASE_PUBLISHABLE_KEY,
  }
}
