import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as fontkit from 'fontkit'
import subsetFont from 'subset-font'

const sourceRoot = path.resolve('src')
const defaultOutputRoot = path.resolve('src/assets/fonts')
const defaultCssOutput = path.resolve('src/styles/fonts.css')
const sourceExtensions = new Set(['.css', '.html', '.js', '.jsx'])
const printableAscii = Array.from({ length: 95 }, (_, index) => String.fromCodePoint(index + 32)).join('')
const ownedFontFile = /^(?:manrope-latin|noto-(?:serif|sans)-tc-(?:400|500|600|700)(?:-extra-\d+)?)\.woff2$/
const preservedNameIds = [0, 1, 2, 4, 6, 13, 14]

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
    if (Buffer.compare(await readFile(filePath), contents) === 0) return false
  } catch {
    // The initial generation creates the committed local artifact.
  }
  await writeFile(filePath, contents)
  return true
}

function ownedOutputPath(outputRoot, fileName) {
  const resolvedRoot = path.resolve(outputRoot)
  const target = path.resolve(resolvedRoot, fileName)
  if (!ownedFontFile.test(fileName) || path.dirname(target) !== resolvedRoot) {
    throw new Error(`Refusing to manage non-font output: ${fileName}`)
  }
  return target
}

async function removeStaleFontFiles(outputRoot, currentOutputs) {
  const resolvedRoot = path.resolve(outputRoot)
  const current = new Set(currentOutputs)
  const entries = await readdir(resolvedRoot, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isFile() || !ownedFontFile.test(entry.name) || current.has(entry.name)) continue
    await rm(ownedOutputPath(resolvedRoot, entry.name))
  }
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
  const codePoints = [...new Set(characters.map((character) => character.codePointAt(0)))].sort((left, right) => left - right)
  const ranges = []

  for (const codePoint of codePoints) {
    const current = ranges.at(-1)
    if (current && codePoint === current.end + 1) current.end = codePoint
    else ranges.push({ start: codePoint, end: codePoint })
  }

  return ranges.map(({ start, end }) => {
    const first = `U+${start.toString(16).toUpperCase()}`
    return start === end ? first : `${first}-${end.toString(16).toUpperCase()}`
  }).join(', ')
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
    resolved.set(shard.source, [...(resolved.get(shard.source) ?? []), character])
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
    .filter((filePath) => filePath !== defaultCssOutput)
    .sort()
  const sourceText = (await Promise.all(sourceFiles.map((filePath) => readFile(filePath, 'utf8')))).join('')
  return [...new Set([...`${printableAscii}${sourceText}`].filter((character) => character.codePointAt(0) >= 32))]
    .sort((left, right) => left.codePointAt(0) - right.codePointAt(0))
    .join('')
}

export async function validateGeneratedFontCoverage(characters, manifest) {
  const currentManifest = manifest ?? {
    ...JSON.parse(await readFile(path.join(defaultOutputRoot, 'font-manifest.json'), 'utf8')),
    outputRoot: defaultOutputRoot,
  }
  const missing = []

  for (const font of fontDefinitions.filter((font) => font.packageName)) {
    const faces = await Promise.all(currentManifest.fontFaces
      .filter((face) => face.family === font.family && face.weight === font.weight)
      .map(async (face) => ({ ...face, font: fontkit.create(await readFile(ownedOutputPath(currentManifest.outputRoot, face.output))) })))

    for (const character of characters) {
      if (!faces.some((face) => (!face.unicodeRange || unicodeRangeContains(face.unicodeRange, character)) && face.font.hasGlyphForCodePoint(character.codePointAt(0)))) {
        missing.push(`${font.family} ${font.weight} U+${character.codePointAt(0).toString(16).toUpperCase()}`)
      }
    }
  }

  return missing
}

export async function generateLocalFonts({ characters, outputRoot = defaultOutputRoot, cssOutput = defaultCssOutput } = {}) {
  const subsetCharacters = characters ?? await collectSubsetCharacters()
  const resolvedOutputRoot = path.resolve(outputRoot)
  const manifestOutput = path.join(resolvedOutputRoot, 'font-manifest.json')
  await mkdir(resolvedOutputRoot, { recursive: true })

  const fontFaces = []
  let changed = 0
  for (const font of fontDefinitions) {
    const subset = await subsetFont(await readFile(font.source), subsetCharacters, { targetFormat: 'woff2', preserveNameIds: preservedNameIds })
    if (await writeIfChanged(ownedOutputPath(resolvedOutputRoot, font.output), subset)) changed += 1
    if (!font.packageName) {
      fontFaces.push(font)
      continue
    }

    const missing = missingGlyphs(subset, subsetCharacters)
    fontFaces.push({ ...font, unicodeRange: formatUnicodeRange([...subsetCharacters].filter((character) => !missing.includes(character))) })

    for (const [source, shardCharacters] of await resolveShardSources(font, missing)) {
      const output = supplementOutputName(font, source)
      const supplement = await subsetFont(await readFile(path.join('node_modules', font.packageName, 'files', source)), shardCharacters.join(''), { targetFormat: 'woff2', preserveNameIds: preservedNameIds })
      if (await writeIfChanged(ownedOutputPath(resolvedOutputRoot, output), supplement)) changed += 1
      fontFaces.push({ ...font, output, unicodeRange: formatUnicodeRange(shardCharacters) })
    }
  }

  await removeStaleFontFiles(resolvedOutputRoot, fontFaces.map(({ output }) => output))
  const manifest = { fontFaces, outputRoot: resolvedOutputRoot }
  const missing = await validateGeneratedFontCoverage(subsetCharacters, manifest)
  if (missing.length) throw new Error(`Generated local fonts are missing glyphs: ${missing.join(', ')}`)

  const css = ['/* Generated by scripts/build-local-fonts.mjs from pinned Fontsource sources. */', ...fontFaces.map(fontFaceCss)].join('\n\n') + '\n'
  if (await writeIfChanged(cssOutput, Buffer.from(css))) changed += 1
  if (await writeIfChanged(manifestOutput, Buffer.from(`${JSON.stringify({ fontFaces }, null, 2)}\n`))) changed += 1

  const fontBytes = await Promise.all(fontFaces.map(async ({ output }) => (await stat(ownedOutputPath(resolvedOutputRoot, output))).size))
  return { ...manifest, changed, fontBytes: fontBytes.reduce((sum, size) => sum + size, 0) }
}

async function buildLocalFonts() {
  const result = await generateLocalFonts()
  console.log(`Generated ${result.fontFaces.length} local font subsets (${result.fontBytes} bytes; ${result.changed} files changed).`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await buildLocalFonts()
}
