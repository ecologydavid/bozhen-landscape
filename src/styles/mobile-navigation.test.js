import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const stylesheet = readFileSync(resolve('src/styles/mobile-navigation.css'), 'utf8')
const mobileStyles = stylesheet.slice(stylesheet.indexOf('@media (max-width:768px)'))

function rule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
  expect(match, `missing CSS rule for ${selector}`).not.toBeNull()
  return match[1]
}

test('keeps the editorial navigation visual mobile-only', () => {
  expect(rule(stylesheet, '.site-nav__visual')).toMatch(/display:\s*none;/)
  expect(rule(mobileStyles, '.site-nav__visual')).toMatch(/display:\s*grid;/)
})

test('uses the full drawer width for the editorial index and visual', () => {
  expect(rule(mobileStyles, '.site-nav__index')).toMatch(/width:\s*100%;/)
  expect(rule(mobileStyles, '.site-nav__visual')).toMatch(/width:\s*100%;/)
})

test('gives every mobile editorial row at least 82 pixels of height', () => {
  const match = rule(mobileStyles, '.site-nav__item').match(/min-height:\s*(\d+)px;/)

  expect(match).not.toBeNull()
  expect(Number(match[1])).toBeGreaterThanOrEqual(82)
})
