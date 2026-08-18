import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const projects = readFileSync(resolve('src/styles/projects.css'), 'utf8')
const responsive = readFileSync(resolve('src/styles/responsive.css'), 'utf8')

test('makes the first desktop gallery picture span the complete two-row feature', () => {
  expect(projects).toMatch(
    /\.project-gallery__grid > picture,\s*\.project-gallery__grid > \.image-fallback \{\s*width: 100%;\s*height: 440px;/,
  )
  expect(projects).toMatch(
    /\.project-gallery__grid > picture > img \{\s*width: 100%;\s*height: 100%;\s*object-fit: cover;/,
  )
  expect(projects).toMatch(
    /\.project-gallery__grid > \.image-fallback \{\s*min-height: 0;/,
  )
  expect(projects).toMatch(
    /\.project-gallery__grid > picture:first-child,\s*\.project-gallery__grid > \.image-fallback:first-child \{\s*grid-row: span 2;\s*height: 908px;/,
  )
})

test('resets normal and fallback gallery geometry to one mobile row', () => {
  expect(responsive).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.project-gallery__grid > picture,\s*\.project-gallery__grid > \.image-fallback,\s*\.project-gallery__grid > picture:first-child,\s*\.project-gallery__grid > \.image-fallback:first-child \{\s*grid-row: auto;\s*height: min\(70vw, 560px\);/,
  )
})
