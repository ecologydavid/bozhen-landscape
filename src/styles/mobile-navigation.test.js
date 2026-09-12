import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const stylesheet = readFileSync(resolve('src/styles/mobile-navigation.css'), 'utf8')
const mobileStyles = stylesheet.slice(stylesheet.indexOf('@media (max-width: 768px)'))

function rule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
  expect(match, `missing CSS rule for ${selector}`).not.toBeNull()
  return match[1]
}

test('uses a mobile-only masthead instead of a menu visual or contact tray', () => {
  expect(rule(stylesheet, '.site-nav__masthead')).toMatch(/display:\s*none;/)
  expect(rule(mobileStyles, '.site-nav__masthead')).toMatch(/display:\s*flex;/)
  expect(stylesheet).not.toContain('.site-nav__visual')
  expect(stylesheet).not.toContain('.site-nav__contacts')
})

test('keeps every mobile navigation row at the approved 82 pixel minimum', () => {
  const match = rule(mobileStyles, '.site-nav__item').match(/min-height:\s*(\d+)px;/)
  expect(match).not.toBeNull()
  expect(Number(match[1])).toBe(82)
})

test('builds the green leaf-ring action affordance', () => {
  const ring = rule(mobileStyles, '.site-nav__arrow')
  expect(ring).toMatch(/width:\s*38px;/)
  expect(ring).toMatch(/height:\s*38px;/)
  expect(ring).toMatch(/border-radius:\s*50%;/)
  expect(ring).toMatch(/background:\s*#dcebdc;/)
  expect(rule(mobileStyles, '.site-nav__arrow::before')).toMatch(/border:\s*1\.4px dashed #75a980;/)
})

test('preserves a calm lower brand signature in the fullscreen menu', () => {
  expect(rule(mobileStyles, '.site-nav::after')).toMatch(/YAO SHENG LANDSCAPE DESIGN/)
  expect(rule(mobileStyles, '.site-nav::after')).toMatch(/margin-top:\s*auto;/)
})

test('removes leaf-ring motion for reduced-motion users', () => {
  const reducedMotionStyles = stylesheet.slice(stylesheet.indexOf('@media (prefers-reduced-motion: reduce)'))
  expect(reducedMotionStyles).toMatch(/\.site-nav__arrow[^}]*transition:\s*none;/)
  expect(reducedMotionStyles).toMatch(/\.site-nav__item:hover \.site-nav__arrow[\s\S]*?transform:\s*none;/)
})
