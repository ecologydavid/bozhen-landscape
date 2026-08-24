import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const stylesheet = readFileSync(resolve('src/styles/layout.css'), 'utf8')

function rule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
  expect(match, `missing CSS rule for ${selector}`).not.toBeNull()
  return match[1]
}

function stoneSproutRules(source) {
  return [...source.matchAll(/\.leaf-contact-links--stone-sprout[^{]*\{[^}]*\}/g)]
    .map(([match]) => match)
    .join('\n')
}

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

test('builds the stone sprout contacts on an asymmetric isolated stone base', () => {
  const stoneBase = rule(stylesheet, '.leaf-contact-links--stone-sprout')
  const stoneOutline = rule(stylesheet, '.leaf-contact-links--stone-sprout::before')
  const sproutStem = rule(stylesheet, '.leaf-contact-links--stone-sprout::after')

  expect(stoneBase).toMatch(/isolation:\s*isolate;/)
  expect(stoneBase).toMatch(/gap:\s*0;/)
  expect(stoneBase).toMatch(/padding:\s*7px;/)
  expect(stoneBase).toMatch(/border:\s*1px solid rgba\(54, 90, 69, 0\.28\);/)
  expect(stoneBase).toMatch(/border-radius:\s*17px 25px 15px 21px;/)
  expect(stoneBase).toMatch(/background:\s*linear-gradient\(/)
  expect(stoneOutline).toMatch(/inset:\s*3px -3px -3px 4px;/)
  expect(stoneOutline).toMatch(/border:\s*1px solid rgba\(54, 90, 69, 0\.24\);/)
  expect(stoneOutline).toMatch(/border-radius:\s*21px 17px 24px 14px;/)
  expect(rule(stylesheet, '.leaf-contact-links::before')).toMatch(
    /border-radius:\s*50% 50% 0 0;/,
  )
  expect(sproutStem).toMatch(/z-index:\s*2;/)
  expect(sproutStem).toMatch(/left:\s*57%;/)
  expect(sproutStem).toMatch(
    /background:\s*linear-gradient\(180deg, rgba\(251, 250, 245, 0\.1\), rgba\(251, 250, 245, 0\.58\), rgba\(251, 250, 245, 0\.12\)\);/,
  )
  expect(sproutStem).toMatch(
    /box-shadow:\s*1px 0 rgba\(54, 90, 69, 0\.28\), -1px 0 rgba\(251, 250, 245, 0\.16\);/,
  )
  expect(sproutStem).toMatch(/pointer-events:\s*none;/)
  expect(sproutStem).toMatch(/background:\s*linear-gradient\(180deg,/)
  expect(sproutStem).toMatch(/transform:\s*rotate\(6deg\);/)
})

test('keeps stone sprout actions compact, organic, and accessible', () => {
  const item = rule(
    stylesheet,
    '.leaf-contact-links--stone-sprout .leaf-contact-links__item',
  )
  const line = rule(
    stylesheet,
    '.leaf-contact-links--stone-sprout .leaf-contact-links__line',
  )
  const phone = rule(
    stylesheet,
    '.leaf-contact-links--stone-sprout .leaf-contact-links__phone',
  )
  const arrow = rule(
    stylesheet,
    '.leaf-contact-links--stone-sprout .leaf-contact-links__arrow',
  )
  const hover = rule(
    stylesheet,
    '.leaf-contact-links--stone-sprout .leaf-contact-links__item:hover',
  )
  const active = rule(
    stylesheet,
    '.leaf-contact-links--stone-sprout .leaf-contact-links__item:active',
  )
  const focus = rule(
    stylesheet,
    '.leaf-contact-links--stone-sprout .leaf-contact-links__item:focus-visible',
  )
  const phoneFocus = rule(
    stylesheet,
    '.leaf-contact-links--stone-sprout .leaf-contact-links__phone:focus-visible',
  )

  expect(item).toMatch(/min-width:\s*0;/)
  expect(item).toMatch(/min-height:\s*56px;/)
  expect(item).toMatch(/white-space:\s*nowrap;/)
  expect(line).toMatch(/border-radius:\s*11px 22px 12px 18px;/)
  expect(phone).toMatch(/margin:\s*0;/)
  expect(phone).toMatch(/border-color:\s*rgba\(54, 90, 69, 0\.48\);/)
  expect(phone).toMatch(/border-radius:\s*21px 11px 18px 12px;/)
  expect(phone).toMatch(/background:\s*rgba\(251, 250, 245, 0\.88\);/)
  expect(arrow).toMatch(/white-space:\s*nowrap;/)
  expect(hover).toMatch(/transform:\s*translateY\(-2px\);/)
  expect(active).toMatch(/transform:\s*scale\(\.99\);/)
  expect(focus).toMatch(/outline:\s*3px solid var\(--gold-400\);/)
  expect(phoneFocus).toMatch(/outline:\s*3px solid var\(--moss-800\);/)
  expect(phoneFocus).toMatch(/outline-offset:\s*3px;/)
  expect(stylesheet).toMatch(
    /\.leaf-contact-links--stone-sprout \.leaf-contact-links__item:hover \.leaf-contact-links__arrow,\s*\.leaf-contact-links--stone-sprout \.leaf-contact-links__item:focus-visible \.leaf-contact-links__arrow \{\s*transform:\s*translate\(3px, -2px\);/,
  )
})

test('keeps the stone sprout modifier free of pill and clipped shapes', () => {
  const styles = stoneSproutRules(stylesheet)

  expect(styles).not.toMatch(/clip-path:/)
  expect(styles).not.toMatch(/border-radius:\s*50%/)
})
