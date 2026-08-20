import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const stylesheet = readFileSync(resolve('src/styles/responsive.css'), 'utf8')
const tokens = readFileSync(resolve('src/styles/tokens.css'), 'utf8')
const mobileStyles = stylesheet.slice(stylesheet.indexOf('@media (max-width: 768px)'))

function rule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
  expect(match, `missing CSS rule for ${selector}`).not.toBeNull()
  return match[1]
}

test('keeps the Hero direct contact pair visible at mobile widths', () => {
  expect(stylesheet).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.hero__actions > \.leaf-contact-links \{[\s\S]*?display: grid;/,
  )
  expect(stylesheet).not.toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.hero__actions > \.leaf-contact-links \{\s*display: none;/,
  )
})

test('keeps mobile quick contacts hidden until their visibility controller enables them', () => {
  expect(stylesheet).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.mobile-contact-bar:not\(\.is-visible\) \{\s*opacity: 0;\s*pointer-events: none;\s*transform: translateY\(100%\);/,
  )
})

test('stretches the mobile Hero media row through the 768px handoff', () => {
  expect(stylesheet).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.hero__layout \{[\s\S]*?grid-template-columns: 1fr;[\s\S]*?grid-template-rows: minmax\(420px, 118vw\) auto;[\s\S]*?align-items: stretch;/,
  )
  expect(stylesheet).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.hero__media \{[\s\S]*?min-height: 420px;[\s\S]*?align-self: stretch;[\s\S]*?height: 100%;/,
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

test('reveals the mobile drawer from left to right without changing its visibility delay', () => {
  const closedDrawer = rule(mobileStyles, '.site-nav')
  const openDrawer = rule(mobileStyles, '.site-nav.is-open')

  expect(closedDrawer).toMatch(/clip-path:\s*inset\(0 100% 0 0 round var\(--canvas-radius\)\);/)
  expect(closedDrawer).toMatch(/opacity:\s*0;/)
  expect(closedDrawer).toMatch(/transform:\s*translateX\(-24px\);/)
  expect(closedDrawer).toMatch(/visibility 0s linear 220ms;/)
  expect(openDrawer).toMatch(/clip-path:\s*inset\(0 0 0 0 round var\(--canvas-radius\)\);/)
  expect(openDrawer).toMatch(/opacity:\s*1;/)
  expect(openDrawer).toMatch(/transform:\s*translateX\(0\);/)
  expect(openDrawer).toMatch(/transition-delay:\s*0s;/)
})

test('reduces drawer chrome only when the mobile viewport is short', () => {
  const marker = '@media (max-width: 768px) and (max-height: 760px)'
  expect(stylesheet).toContain(marker)
  const shortMobileStyles = stylesheet.slice(stylesheet.indexOf(marker))
  const compactDrawer = rule(shortMobileStyles, '.site-nav')

  expect(compactDrawer).toMatch(/gap:\s*8px;/)
  expect(compactDrawer).toMatch(
    /padding:\s*calc\(var\(--header-height\) \+ 8px\) max\(20px, 6vw\) calc\(16px \+ env\(safe-area-inset-bottom\)\);/,
  )
})

test('lets the document shrink below 320 CSS pixels when a Windows scrollbar is present', () => {
  expect(tokens).toMatch(
    /body \{[\s\S]*?min-width: 0;[\s\S]*?overflow-x: hidden;/,
  )
  expect(tokens).not.toMatch(/body \{[\s\S]*?min-width: 320px;/)
})
