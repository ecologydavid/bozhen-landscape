import { describe, expect, test } from 'vitest'
import { readStudioEnv } from './env'

const supabaseUrl = 'https://example.supabase.co'
const modernPublishableKey = 'sb_publishable_test-only-not-a-real-key'

function createTestJwt(role) {
  const encode = (value) => btoa(JSON.stringify(value))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role })}.test-signature`
}

describe('readStudioEnv', () => {
  test('returns validated public settings for a modern publishable key', () => {
    expect(readStudioEnv({
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: modernPublishableKey,
    })).toEqual({
      supabaseUrl,
      supabasePublishableKey: modernPublishableKey,
    })
  })

  test('accepts a legacy anon JWT', () => {
    const legacyAnonKey = createTestJwt('anon')

    expect(readStudioEnv({
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: legacyAnonKey,
    })).toEqual({
      supabaseUrl,
      supabasePublishableKey: legacyAnonKey,
    })
  })

  test('rejects a modern secret key', () => {
    expect(() => readStudioEnv({
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test-only-not-a-real-key',
    })).toThrow(/publishable/i)
  })

  test('rejects a legacy service-role JWT', () => {
    expect(() => readStudioEnv({
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: createTestJwt('service_role'),
    })).toThrow(/publishable/i)
  })

  test('rejects malformed JWT-like keys', () => {
    expect(() => readStudioEnv({
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.%%%.test-signature',
    })).toThrow(/publishable/i)
  })

  test('rejects unrecognized privileged key formats', () => {
    expect(() => readStudioEnv({
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_admin_test-only-not-a-real-key',
    })).toThrow(/publishable/i)
  })

  test('rejects service-role material case-insensitively', () => {
    expect(() => readStudioEnv({
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test-SERVICE_ROLE-not-real',
    })).toThrow(/publishable/i)
  })

  test('rejects keys shorter than the minimum length', () => {
    expect(() => readStudioEnv({
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'short',
    })).toThrow()
  })

  test('rejects invalid Supabase URLs', () => {
    expect(() => readStudioEnv({
      VITE_SUPABASE_URL: 'not-a-url',
      VITE_SUPABASE_PUBLISHABLE_KEY: modernPublishableKey,
    })).toThrow()
  })
})
