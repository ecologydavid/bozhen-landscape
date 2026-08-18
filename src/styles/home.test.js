import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const stylesheet = readFileSync(resolve('src/styles/home.css'), 'utf8')

test('fills the Hero media frame with its image and fallback on desktop', () => {
  expect(stylesheet).toMatch(
    /\.hero__image,\s*\.hero__media > \.image-fallback \{\s*position: absolute;\s*inset: 0;\s*width: 100%;\s*height: 100%;\s*object-fit: cover;\s*object-position: 50% 52%;/,
  )
})
