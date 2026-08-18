import { access, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import convert from 'heic-convert'
import sharp from 'sharp'
import { projectAssetManifest } from './project-asset-manifest.mjs'

const defaultRoots = {
  originalRoot: path.resolve('workbench/landscape-originals'),
  editedRoot: path.resolve('workbench/landscape-edited'),
  outputRoot: path.resolve('src/assets/projects'),
}

const inputPixelLimit = 40_000_000

function resolveWithin(root, segments, label) {
  const target = path.resolve(root, ...segments)
  const relative = path.relative(root, target)
  if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw new Error(`${label} resolves outside approved asset roots`)
  }
  return target
}

function validateManifest(manifest, originalRoot, editedRoot) {
  if (!Array.isArray(manifest)) throw new Error('Project asset manifest must be an array')

  for (const item of manifest) {
    if (item?.approved !== true) {
      throw new Error(`Asset is not approved for public output: ${item?.folder}/${item?.source}`)
    }
  }

  const stems = new Set()
  return manifest.map((item) => {
    if (typeof item.folder !== 'string' || !item.folder) {
      throw new Error('Project asset folder must be a non-empty string')
    }
    if (typeof item.source !== 'string' || !item.source || path.basename(item.source) !== item.source) {
      throw new Error(`Source path resolves outside approved asset roots: ${item.source}`)
    }
    if (
      typeof item.output !== 'string'
      || path.basename(item.output) !== item.output
      || path.extname(item.output) !== '.webp'
    ) {
      throw new Error(`Public output must be a WebP basename: ${item.output}`)
    }

    const stem = path.parse(item.output).name
    if (!stem) throw new Error(`Public output must include a stem: ${item.output}`)
    const collisionKey = stem.toLocaleLowerCase('en-US')
    if (stems.has(collisionKey)) {
      throw new Error(`Duplicate project asset output stem: ${stem}`)
    }
    stems.add(collisionKey)

    const originalFolder = resolveWithin(originalRoot, [item.folder], 'Original folder')
    const editedFolder = resolveWithin(editedRoot, [item.folder], 'Edited folder')
    const sourceStem = path.parse(item.source).name
    const candidates = [
      resolveWithin(editedRoot, [path.relative(editedRoot, editedFolder), `${sourceStem}.png`], 'Edited input'),
      resolveWithin(editedRoot, [path.relative(editedRoot, editedFolder), `${sourceStem}.jpg`], 'Edited input'),
      resolveWithin(originalRoot, [path.relative(originalRoot, originalFolder), item.source], 'Original input'),
    ]

    return { ...item, stem, candidates }
  })
}

async function firstExistingInput(item, accessFile) {
  for (const candidate of item.candidates) {
    try {
      await accessFile(candidate)
      return candidate
    } catch {
      continue
    }
  }
  throw new Error(`Missing source asset: ${item.folder}/${item.source}`)
}

export async function preflightProjectAssets(manifest, {
  originalRoot = defaultRoots.originalRoot,
  editedRoot = defaultRoots.editedRoot,
  accessFile = access,
} = {}) {
  const resolvedOriginalRoot = path.resolve(originalRoot)
  const resolvedEditedRoot = path.resolve(editedRoot)
  const validated = validateManifest(manifest, resolvedOriginalRoot, resolvedEditedRoot)
  return Promise.all(validated.map(async (item) => ({
    ...item,
    input: await firstExistingInput(item, accessFile),
  })))
}

export async function buildProjectAssets({
  manifest = projectAssetManifest,
  originalRoot = defaultRoots.originalRoot,
  editedRoot = defaultRoots.editedRoot,
  outputRoot = defaultRoots.outputRoot,
} = {}) {
  const assets = await preflightProjectAssets(manifest, { originalRoot, editedRoot })
  const resolvedOutputRoot = path.resolve(outputRoot)
  await mkdir(resolvedOutputRoot, { recursive: true })

  for (const item of assets) {
    const source = path.extname(item.input).toLowerCase() === '.heic'
      ? await convert({ buffer: await readFile(item.input), format: 'JPEG', quality: 0.96 })
      : item.input
    const image = sharp(source, { limitInputPixels: inputPixelLimit })
      .rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })

    await Promise.all([
      image.clone()
        .webp({ quality: 78, effort: 6, smartSubsample: true })
        .toFile(path.join(resolvedOutputRoot, `${item.stem}.webp`)),
      image.clone()
        .avif({ quality: 52, effort: 6, chromaSubsampling: '4:2:0' })
        .toFile(path.join(resolvedOutputRoot, `${item.stem}.avif`)),
    ])
  }

  return assets.length
}

const isDirectRun = Boolean(
  process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url,
)

if (isDirectRun) {
  const count = await buildProjectAssets()
  console.log(`Built ${count} approved project assets in WebP and AVIF.`)
}
