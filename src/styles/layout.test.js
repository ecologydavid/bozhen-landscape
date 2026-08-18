import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const stylesheet = readFileSync(resolve('src/styles/layout.css'), 'utf8')

test('keeps the desktop navigation shell aligned', () => {
  expect(stylesheet).toMatch(
    /\.site-nav \{\s*display: flex;\s*align-items: center;\s*gap: clamp\(24px, 3vw, 46px\);\s*\}/,
  )
})
