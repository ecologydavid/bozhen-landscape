import { expect, test } from 'vitest'
import config from './vite.config'

test('builds assets with relative paths for GitHub project pages', () => {
  expect(config.base).toBe('./')
})
