import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('keeps scene-marked sections transparent above component backgrounds', () => {
  const stylesheet = readFileSync(resolve('src/styles/scene.css'), 'utf8')

  expect(stylesheet).toMatch(
    /\.scene-section\[data-scene\]\s*\{\s*background:\s*transparent;/,
  )
  expect(stylesheet).toMatch(
    /\.scene-section\.contact-panel\s*\{\s*background:\s*var\(--graphite-900\);/,
  )
})
