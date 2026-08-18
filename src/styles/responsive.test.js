import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const stylesheet = readFileSync(resolve('src/styles/responsive.css'), 'utf8')

test('hides only Hero inline contact links at mobile widths', () => {
  expect(stylesheet).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.hero__actions > \.leaf-contact-links \{\s*display: none;/,
  )
})

test('sizes the fixed drawer from its mobile insets', () => {
  expect(stylesheet).toMatch(
    /\.site-nav \{[\s\S]*?inset: 12px 12px 12px max\(52px, 14vw\);[\s\S]*?height: auto;[\s\S]*?max-height: calc\(100dvh - 24px\);/,
  )
})

test('keeps the scrolled mobile header blur within its rounded surface', () => {
  expect(stylesheet).toMatch(
    /\.site-header\.is-scrolled::before \{\s*border-radius: inherit;\s*background: rgba\(251, 250, 245, 0\.94\);/,
  )
})

test('reveals the mobile drawer before its focus target is scheduled', () => {
  expect(stylesheet).toMatch(
    /\.site-nav \{[\s\S]*?visibility: hidden;[\s\S]*?transition:[\s\S]*?visibility 0s linear 220ms;/,
  )
  expect(stylesheet).toMatch(
    /\.site-nav\.is-open \{[\s\S]*?visibility: visible;[\s\S]*?transition-delay: 0s;/,
  )
})
