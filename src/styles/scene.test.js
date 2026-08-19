import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('provides transparent light-on-dark surfaces for scene-marked sections', () => {
  const stylesheet = readFileSync(resolve('src/styles/scene.css'), 'utf8')

  expect(stylesheet).toMatch(
    /\.scene-section\[data-scene\]\s*\{\s*background:\s*transparent;/,
  )
  expect(stylesheet).toMatch(
    /\.scene-section\[data-scene='water'\],\s*\.scene-section\[data-scene='craft'\]\s*\{[\s\S]*?--ink:\s*#faf9f5;[\s\S]*?--muted:\s*rgba\(250,\s*249,\s*245,\s*0\.78\);[\s\S]*?--line:\s*rgba\(250,\s*249,\s*245,\s*0\.24\);[\s\S]*?color:\s*var\(--ink\);/,
  )
  expect(stylesheet).toMatch(
    /\.scene-section\[data-scene='water'\]\s*\{[\s\S]*?background:\s*rgba\(13,\s*29,\s*23,\s*0\.84\);/,
  )
  expect(stylesheet).toMatch(
    /\.scene-section\[data-scene='craft'\]\s*\{[\s\S]*?background:\s*rgba\(15,\s*28,\s*23,\s*0\.7\);/,
  )
  expect(stylesheet).toMatch(
    /\.scene-section\[data-scene='care'\],\s*\.scene-section\.contact-panel\s*\{[\s\S]*?--ink:\s*#faf9f5;[\s\S]*?background:\s*rgba\(18,\s*28,\s*22,\s*0\.76\);/,
  )
})

test('keeps the stone scene readable over its crossfading environment', () => {
  const stylesheet = readFileSync(resolve('src/styles/scene.css'), 'utf8')

  expect(stylesheet).toMatch(
    /\.scene-section\[data-scene='stone'\]\s*\{[\s\S]*?--ink:\s*#18221c;[\s\S]*?--muted:\s*#48544b;[\s\S]*?--moss-800:\s*#274635;[\s\S]*?--sun-500:\s*#7a5017;[\s\S]*?--gold-500:\s*#7a5017;[\s\S]*?--gold-400:\s*#84591c;[\s\S]*?background:\s*rgba\(250,\s*249,\s*245,\s*0\.88\);[\s\S]*?color:\s*var\(--ink\);/,
  )
})

test('bridges craft into care without opaque section bands', () => {
  const sceneStyles = readFileSync(resolve('src/styles/scene.css'), 'utf8')
  const homeStyles = readFileSync(resolve('src/styles/home.css'), 'utf8')

  expect(sceneStyles).toMatch(
    /\.craft-care-bridge\s*\{[\s\S]*?linear-gradient\([\s\S]*?rgba\([\s\S]*?rgba\(/,
  )
  expect(sceneStyles).toMatch(
    /\.craft-care-bridge\s+\.brand-story,\s*\.craft-care-bridge\s+\.client-types\s*\{\s*background:\s*transparent;/,
  )
  expect(homeStyles).not.toMatch(/\.brand-story\s*\{\s*background:\s*var\(--paper\)/)
  expect(homeStyles).not.toMatch(/\.client-types\s*\{[\s\S]*?background:\s*var\(--paper\)/)
})
