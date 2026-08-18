import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const stylesheet = readFileSync(resolve('src/styles/responsive.css'), 'utf8')

test('hides only Hero inline contact links at mobile widths', () => {
  expect(stylesheet).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.hero__actions > \.leaf-contact-links \{\s*display: none;/,
  )
})
