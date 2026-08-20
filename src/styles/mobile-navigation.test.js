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

test('keeps every mobile editorial row at the approved 82 pixel minimum', () => {
  const match = rule(mobileStyles, '.site-nav__item').match(/min-height:\s*(\d+)px;/)

  expect(match).not.toBeNull()
  expect(Number(match[1])).toBe(82)
})

test('fits the image fallback inside the editorial visual frame', () => {
  const fallback = rule(mobileStyles, '.site-nav__visual .image-fallback')

  expect(fallback).toMatch(/min-height:\s*0;/)
  expect(fallback).toMatch(/align-content:\s*start;/)
  expect(fallback).toMatch(/padding:\s*14px 16px 42px;/)
  expect(rule(mobileStyles, '.site-nav__visual .image-fallback > *')).toMatch(
    /visibility:\s*hidden;/,
  )
})

test('keeps 82 pixel rows while hiding only the visual on compact-height viewports', () => {
  const marker = '@media (max-width:768px) and (max-height:768px)'
  expect(stylesheet).toContain(marker)
  const shortMobileStyles = stylesheet.slice(stylesheet.indexOf(marker))

  expect(rule(shortMobileStyles, '.site-nav__visual')).toMatch(/display:\s*none;/)
  expect(shortMobileStyles).not.toMatch(
    /\.site-nav__item\s*\{[^}]*min-height:/,
  )
})
