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

test('makes the mobile navigation cover the full viewport', () => {
  expect(stylesheet).toMatch(
    /\.site-nav \{[\s\S]*?inset: 0;[\s\S]*?min-height: 100dvh;[\s\S]*?max-height: none;/,
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

test('reveals the mobile navigation across the full canvas without a side strip', () => {
  const closedDrawer = rule(mobileStyles, '.site-nav')
  const openDrawer = rule(mobileStyles, '.site-nav.is-open')

  expect(closedDrawer).toMatch(/clip-path:\s*inset\(0 0 0 100%\);/)
  expect(closedDrawer).toMatch(/opacity:\s*0;/)
  expect(closedDrawer).toMatch(/transform:\s*translateX\(18px\);/)
  expect(closedDrawer).toMatch(/visibility 0s linear 220ms;/)
  expect(openDrawer).toMatch(/clip-path:\s*inset\(0 0 0 0\);/)
  expect(openDrawer).toMatch(/opacity:\s*1;/)
  expect(openDrawer).toMatch(/transform:\s*translateX\(0\);/)
  expect(openDrawer).toMatch(/transition-delay:\s*0s;/)
})

test('reduces fullscreen navigation spacing through the measured 768 pixel height boundary', () => {
  const marker = '@media (max-width: 768px) and (max-height: 768px)'
  expect(stylesheet).toContain(marker)
  const shortMobileStyles = stylesheet.slice(stylesheet.indexOf(marker))
  const compactDrawer = rule(shortMobileStyles, '.site-nav')

  expect(compactDrawer).toMatch(/gap:\s*14px;/)
  expect(compactDrawer).toMatch(/padding-top:\s*18px;/)
})

test('keeps the default fullscreen navigation comfortably spaced', () => {
  const drawer = rule(mobileStyles, '.site-nav')

  expect(drawer).toMatch(/gap:\s*20px;/)
  expect(drawer).toMatch(
    /padding:\s*24px clamp\(24px, 7vw, 44px\) calc\(30px \+ env\(safe-area-inset-bottom\)\);/,
  )
})

test('lets the document shrink below 320 CSS pixels when a Windows scrollbar is present', () => {
  expect(tokens).toMatch(
    /body \{[\s\S]*?min-width: 0;[\s\S]*?overflow-x: hidden;/,
  )
  expect(tokens).not.toMatch(/body \{[\s\S]*?min-width: 320px;/)
})

test('keeps the mobile Footer compact through the 768 pixel handoff', () => {
  expect(stylesheet).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.site-footer \{[\s\S]*?padding: 56px 24px 24px;/,
  )
  expect(stylesheet).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.site-footer__inner \{[\s\S]*?gap: 30px;[\s\S]*?padding-bottom: 40px;/,
  )
})

test('compacts stone sprout action spacing for the 320 pixel Hero width', () => {
  const narrowMobileStyles = stylesheet.slice(stylesheet.indexOf('@media (max-width: 560px)'))
  const compactItem = rule(
    narrowMobileStyles,
    '.leaf-contact-links--stone-sprout .leaf-contact-links__item',
  )

  expect(compactItem).toMatch(/gap:\s*5px;/)
  expect(compactItem).toMatch(/padding-inline:\s*6px;/)
  expect(compactItem).toMatch(/font-size:\s*0\.75rem;/)
})

test('removes stone sprout contact motion for reduced-motion users', () => {
  const reducedMotionStyles = stylesheet.slice(
    stylesheet.indexOf('@media (prefers-reduced-motion: reduce)'),
  )

  expect(reducedMotionStyles).toMatch(
    /\.leaf-contact-links--stone-sprout \.leaf-contact-links__item:hover,\s*\.leaf-contact-links--stone-sprout \.leaf-contact-links__item:focus-visible,\s*\.leaf-contact-links--stone-sprout \.leaf-contact-links__item:active,\s*\.leaf-contact-links--stone-sprout \.leaf-contact-links__item:hover \.leaf-contact-links__arrow,\s*\.leaf-contact-links--stone-sprout \.leaf-contact-links__item:focus-visible \.leaf-contact-links__arrow \{\s*transform:\s*none;/,
  )
})
