import { describe, expect, test } from 'vitest'
import { readStudioEnv } from './env'

describe('readStudioEnv', () => {
  test('returns validated public settings', () => {
    expect(readStudioEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key-at-least-20-chars',
    })).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'publishable-key-at-least-20-chars',
    })
  })

  test('rejects service-role material in browser configuration', () => {
    expect(() => readStudioEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'service_role.secret-value',
    })).toThrow(/publishable/i)
  })
})
