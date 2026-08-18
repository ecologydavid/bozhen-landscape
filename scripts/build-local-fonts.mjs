import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as fontkit from 'fontkit'
import subsetFont from 'subset-font'

const sourceRoot = path.resolve('src')
const outputRoot = path.resolve('src/assets/fonts')
const cssOutput = path.resolve('src/styles/fonts.css')
const sourceExtensions = new Set(['.css', '.html', '.js', '.jsx'])
const printableAscii = Array.from({ length: 95 }, (_, index) => String.fromCodePoint(index + 32)).join('')

const fontDefinitions = [
  { family: 'Noto Serif TC', weight: '500', source: 'node_modules/@fontsource/noto-serif-tc/files/noto-serif-tc-chinese-traditional-500-normal.woff2', output: 'noto-serif-tc-500.woff2', packageName: '@fontsource/noto-serif-tc' },
  { family: 'Noto Serif TC', weight: '600', source: 'node_modules/@fontsource/noto-serif-tc/files/noto-serif-tc-chinese-traditional-600-normal.woff2', output: 'noto-serif-tc-600.woff2', packageName: '@fontsource/noto-serif-tc' },
  { family: 'Noto Serif TC', weight: '700', source: 'node_modules/@fontsource/noto-serif-tc/files/noto-serif-tc-chinese-traditional-700-normal.woff2', output: 'noto-serif-tc-700.woff2', packageName: '@fontsource/noto-serif-tc' },
  { family: 'Noto Sans TC', weight: '400', source: 'node_modules/@fontsource/noto-sans-tc/files/noto-sans-tc-chinese-traditional-400-normal.woff2', output: 'noto-sans-tc-400.woff2', packageName: '@fontsource/noto-sans-tc' },
  { family: 'Noto Sans TC', weight: '500', source: 'node_modules/@fontsource/noto-sans-tc/files/noto-sans-tc-chinese-traditional-500-normal.woff2', output: 'noto-sans-tc-500.woff2', packageName: '@fontsource/noto-sans-tc' },
  { family: 'Noto Sans TC', weight: '700', source: 'node_modules/@fontsource/noto-sans-tc/files/noto-sans-tc-chinese-traditional-700-normal.woff2', output: 'noto-sans-tc-700.woff2', packageName: '@fontsource/noto-sans-tc' },
  { family: 'Manrope Variable', weight: '200 800', source: 'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', output: 'manrope-latin.woff2', variable: true },
]

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(filePath))
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(filePath)
  }

  return files
}

async function writeIfChanged(filePath, contents) {
  try {
    const current = await readFile(filePath)
    if (Buffer.compare(current, contents) === 0) return false
  } catch {
    // The initial generation creates the committed local artifact.
  }

  await writeFile(filePath, contents)
  return true
}

function fontFaceCss({ family, output, unicodeRange, variable, weight }) {
  return `@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-display: swap;\n  font-weight: ${weight};\n  src: url('../assets/fonts/${output}') format('${variable ? 'woff2-variations' : 'woff2'}');${unicodeRange ? `\n  unicode-range: ${unicodeRange};` : ''}\n}`
}

function unicodeRangeContains(range, character) {
  const codePoint = character.codePointAt(0)

  return range.split(',').some((token) => {
    const [start, end = start] = token.trim().slice(2).split('-')
    return codePoint >= Number.parseInt(start, 16) && codePoint <= Number.parseInt(end, 16)
  })
}

function formatUnicodeRange(characters) {
  return characters.map((character) => `U+${character.codePointAt(0).toString(16).toUpperCase()}`).join(', ')
}

async function resolveShardSources(font, characters) {
  const css = await readFile(path.join('node_modules', font.packageName, `${font.weight}.css`), 'utf8')
  const shards = [...css.matchAll(/@font-face\s*{([\s\S]*?)}/g)].map(([, block]) => ({
    source: block.match(/src:\s*url\(\.\/files\/([^)]*\.woff2)\)/)?.[1],
    unicodeRange: block.match(/unicode-range:\s*([^;]+);/)?.[1],
  })).filter((shard) => shard.source && shard.unicodeRange)
  const resolved = new Map()

  for (const character of characters) {
    const shard = shards.find(({ unicodeRange }) => unicodeRangeContains(unicodeRange, character))
    if (!shard) throw new Error(`No Fontsource shard covers ${font.family} U+${character.codePointAt(0).toString(16).toUpperCase()}`)

    const sourceCharacters = resolved.get(shard.source) ?? []
    sourceCharacters.push(character)
    resolved.set(shard.source, sourceCharacters)
  }

  return [...resolved.entries()].sort(([left], [right]) => left.localeCompare(right))
}

function missingGlyphs(fontBuffer, characters) {
  const font = fontkit.create(fontBuffer)
  return [...characters].filter((character) => !font.hasGlyphForCodePoint(character.codePointAt(0)))
}

function supplementOutputName(font, source) {
  const shard = path.basename(source).match(/-(\d+)-\d+-normal\.woff2$/)?.[1]
  if (!shard) throw new Error(`Cannot derive Fontsource shard name from ${source}`)
  return `${path.basename(font.output, '.woff2')}-extra-${shard}.woff2`
}

export async function collectSubsetCharacters() {
  const sourceFiles = [...await walk(sourceRoot), path.resolve('index.html')]
    .filter((filePath) => filePath !== cssOutput)
    .sort()
  const sourceText = (await Promise.all(sourceFiles.map((filePath) => readFile(filePath, 'utf8')))).join('')

  return [...new Set([...`${printableAscii}${sourceText}`].filter((character) => character.codePointAt(0) >= 32))]
    .sort((left, right) => left.codePointAt(0) - right.codePointAt(0))
    .join('')
}

export async function validateGeneratedFontCoverage(characters) {
  const cjkFonts = fontDefinitions.filter((font) => font.packageName)
  const missing = []

  for (const font of cjkFonts) {
    const filePrefix = path.basename(font.output, '.woff2')
    const faceFiles = (await readdir(outputRoot)).filter((fileName) => fileName.startsWith(filePrefix) && fileName.endsWith('.woff2'))
    const faces = await Promise.all(faceFiles.map(async (fileName) => fontkit.create(await readFile(path.join(outputRoot, fileName)))))

    for (const character of characters) {
      if (!faces.some((face) => face.hasGlyphForCodePoint(character.codePointAt(0)))) {
        missing.push(`${font.family} ${font.weight} U+${character.codePointAt(0).toString(16).toUpperCase()}`)
      }
    }
  }

  return missing
}

async function buildLocalFonts() {
  const usedCharacters = await collectSubsetCharacters()
  await mkdir(outputRoot, { recursive: true })

  const fontFaces = []
  let changed = 0
  for (const font of fontDefinitions) {
    const subset = await subsetFont(await readFile(font.source), usedCharacters, {
      targetFormat: 'woff2',
      preserveNameIds: [1, 2, 4, 6],
    })
    if (await writeIfChanged(path.join(outputRoot, font.output), subset)) changed += 1
    fontFaces.push(font)

    if (!font.packageName) continue

    const missing = missingGlyphs(subset, usedCharacters)
    for (const [source, characters] of await resolveShardSources(font, missing)) {
      const output = supplementOutputName(font, source)
      const supplement = await subsetFont(await readFile(path.join('node_modules', font.packageName, 'files', source)), characters.join(''), {
        targetFormat: 'woff2',
        preserveNameIds: [1, 2, 4, 6],
      })
      if (await writeIfChanged(path.join(outputRoot, output), supplement)) changed += 1
      fontFaces.push({ ...font, output, unicodeRange: formatUnicodeRange(characters) })
    }
  }

  const missing = await validateGeneratedFontCoverage(usedCharacters)
  if (missing.length) throw new Error(`Generated local fonts are missing glyphs: ${missing.join(', ')}`)

  const css = [
    '/* Generated by scripts/build-local-fonts.mjs from pinned Fontsource sources. */',
    ...fontFaces.map(fontFaceCss),
  ].join('\n\n') + '\n'
  if (await writeIfChanged(cssOutput, Buffer.from(css))) changed += 1

  const fontBytes = await Promise.all(fontFaces.map(async ({ output }) => (await stat(path.join(outputRoot, output))).size))
  console.log(`Generated ${fontFaces.length} local font subsets (${fontBytes.reduce((sum, size) => sum + size, 0)} bytes; ${changed} files changed).`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await buildLocalFonts()
}
