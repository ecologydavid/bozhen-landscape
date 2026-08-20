import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const stylesheet = readFileSync(resolve('src/styles/layout.css'), 'utf8')

test('keeps the desktop navigation shell aligned', () => {
  expect(stylesheet).toMatch(
    /\.site-nav \{\s*display: flex;\s*align-items: center;\s*gap: clamp\(24px, 3vw, 46px\);\s*\}/,
  )
})

test('keeps the scrolled-header blur outside the drawer containing block', () => {
  expect(stylesheet).not.toMatch(
    /\.site-header\.is-scrolled \{[^}]*backdrop-filter:/,
  )
  expect(stylesheet).toMatch(
    /\.site-header\.is-scrolled::before \{[\s\S]*backdrop-filter: blur\(18px\);/,
  )
})

test('keeps the Footer above the fixed scene environment', () => {
  expect(stylesheet).toMatch(
    /\.site-footer \{[\s\S]*?position: relative;[\s\S]*?z-index: 2;[\s\S]*?background: var\(--forest-950\);/,
  )
})
