import { expect, test } from 'vitest'
import config from './vite.config'

test('builds assets with relative paths for GitHub project pages', () => {
  expect(config.base).toBe('./')
})

test('scopes unit tests to this worktree only', () => {
  expect(config.test.include).toEqual(['src/**/*.{test,spec}.{js,jsx}'])
  expect(config.test.exclude).toContain('**/.worktrees/**')
})
