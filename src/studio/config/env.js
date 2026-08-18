import { z } from 'zod'

const studioEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).refine(
    (value) => !value.toLowerCase().includes('service_role'),
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
