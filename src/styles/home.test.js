import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const stylesheet = readFileSync(resolve('src/styles/home.css'), 'utf8')

test('fills the Hero media frame with its image and fallback on desktop', () => {
  expect(stylesheet).toMatch(
    /\.hero__image,\s*\.hero__media > \.image-fallback \{\s*position: absolute;\s*inset: 0;\s*width: 100%;\s*height: 100%;\s*object-fit: cover;\s*object-position: 50% 52%;/,
  )
})

test('fills service cards with images or accessible fallbacks without duplicate overlay copy', () => {
  expect(stylesheet).toMatch(
    /\.service-item__image,\s*\.service-item > picture,\s*\.service-item > \.image-fallback \{\s*position: absolute;\s*z-index: -2;\s*inset: 0;\s*width: 100%;\s*height: 100%;/,
  )
  expect(stylesheet).toMatch(
    /\.service-item > \.image-fallback \{[\s\S]*?min-height: 0;[\s\S]*?padding: 0;/,
  )
  expect(stylesheet).toMatch(
    /\.service-item > \.image-fallback > \* \{\s*visibility: hidden;/,
  )
})

test('keeps the printed contact card geometry when its image falls back', () => {
  expect(stylesheet).toMatch(
    /\.contact-panel__brand img,\s*\.contact-panel__brand > \.image-fallback \{\s*width: 100%;\s*aspect-ratio: 933 \/ 568;\s*border-radius: var\(--radius-image\);/,
  )
  expect(stylesheet).toMatch(
    /\.contact-panel__brand > \.image-fallback \{\s*min-height: 0;/,
  )
})
