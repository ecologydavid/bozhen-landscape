import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { collectSubsetCharacters, validateGeneratedFontCoverage } from '../../scripts/build-local-fonts.mjs'

const runNode = promisify(execFile)

async function generateTestFonts(characters, outputRoot) {
  await runNode(globalThis.process.execPath, ['--input-type=module', '--eval', `
    import path from 'node:path'
    import { generateLocalFonts } from './scripts/build-local-fonts.mjs'
    await generateLocalFonts({
      characters: process.env.YAOSEI_TEST_CHARACTERS,
      outputRoot: process.env.YAOSEI_TEST_OUTPUT,
      cssOutput: path.join(process.env.YAOSEI_TEST_OUTPUT, 'fonts.css'),
    })
  `], {
    cwd: globalThis.process.cwd(),
    env: { ...globalThis.process.env, YAOSEI_TEST_CHARACTERS: characters, YAOSEI_TEST_OUTPUT: outputRoot },
  })
}

test('includes authored CSS content glyphs in the local font subset', async () => {
  const characters = await collectSubsetCharacters()

  expect(characters).toContain('←')
  expect(characters).toContain('—')
})

test('verifies generated font files cover CSS content glyphs', async () => {
  await expect(validateGeneratedFontCoverage('←—')).resolves.toEqual([])
})

test('removes obsolete supplemental subsets from the generated manifest', async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'yaosei-fonts-'))

  try {
    await generateTestFonts('A←', outputRoot)
    const withArrow = JSON.parse(await readFile(path.join(outputRoot, 'font-manifest.json'), 'utf8'))
    expect(withArrow.fontFaces.some(({ output }) => output.includes('-extra-'))).toBe(true)

    await generateTestFonts('A', outputRoot)
    const withoutArrow = {
      ...JSON.parse(await readFile(path.join(outputRoot, 'font-manifest.json'), 'utf8')),
      outputRoot,
    }
    expect(withoutArrow.fontFaces.some(({ output }) => output.includes('-extra-'))).toBe(false)
    await expect(validateGeneratedFontCoverage('←', withoutArrow)).resolves.not.toEqual([])
  } finally {
    await rm(outputRoot, { force: true, recursive: true })
  }
}, 15_000)

test('makes supplemental glyphs reachable without competing primary faces', async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'yaosei-fonts-'))

  try {
    await generateTestFonts('A←', outputRoot)
    const manifest = JSON.parse(await readFile(path.join(outputRoot, 'font-manifest.json'), 'utf8'))
    const serifFaces = manifest.fontFaces.filter(({ family, weight }) => family === 'Noto Serif TC' && weight === '500')
    const primary = serifFaces.find(({ output }) => output === 'noto-serif-tc-500.woff2')
    const arrowSupplement = serifFaces.find(({ unicodeRange }) => unicodeRange === 'U+2190')

    expect(primary.unicodeRange).not.toContain('U+2190')
    expect(arrowSupplement).toBeDefined()
  } finally {
    await rm(outputRoot, { force: true, recursive: true })
  }
})
