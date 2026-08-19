import { randomUUID } from 'node:crypto'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
} from 'node:fs/promises'
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
export const responsiveAssetWidths = [480, 768, 1280, 1920]

function responsiveOutputName(stem, width, extension) {
  return `${stem}${width === 1920 ? '' : `-${width}`}.${extension}`
}

function isWithin(root, target) {
  const relative = path.relative(root, target)
  return !path.isAbsolute(relative)
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
}

function resolveWithin(root, segments, label) {
  const target = path.resolve(root, ...segments)
  if (!isWithin(root, target)) {
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
      {
        path: resolveWithin(
          editedRoot,
          [path.relative(editedRoot, editedFolder), `${sourceStem}.png`],
          'Edited input',
        ),
        root: 'edited',
      },
      {
        path: resolveWithin(
          editedRoot,
          [path.relative(editedRoot, editedFolder), `${sourceStem}.jpg`],
          'Edited input',
        ),
        root: 'edited',
      },
      {
        path: resolveWithin(
          originalRoot,
          [path.relative(originalRoot, originalFolder), item.source],
          'Original input',
        ),
        root: 'original',
      },
    ]

    return { ...item, stem, candidates }
  })
}

async function canonicalRoot(root) {
  try {
    return await realpath(root)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function firstExistingInput(item, canonicalRoots, accessFile) {
  for (const candidate of item.candidates) {
    try {
      await accessFile(candidate.path)
    } catch {
      continue
    }

    const canonicalInput = await realpath(candidate.path)
    const canonicalSourceRoot = canonicalRoots[candidate.root]
    if (!canonicalSourceRoot || !isWithin(canonicalSourceRoot, canonicalInput)) {
      throw new Error(
        `Source input resolves outside canonical asset root: ${item.folder}/${item.source}`,
      )
    }
    return canonicalInput
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
  const canonicalRoots = {
    original: await canonicalRoot(resolvedOriginalRoot),
    edited: await canonicalRoot(resolvedEditedRoot),
  }
  return Promise.all(validated.map(async (item) => ({
    ...item,
    input: await firstExistingInput(item, canonicalRoots, accessFile),
  })))
}

export async function encodeProjectAsset(item, stagingRoot) {
  const source = path.extname(item.input).toLowerCase() === '.heic'
    ? await convert({ buffer: await readFile(item.input), format: 'JPEG', quality: 0.96 })
    : await readFile(item.input)
  const image = sharp(source, { limitInputPixels: inputPixelLimit }).rotate()

  for (const width of responsiveAssetWidths) {
    const resized = image.clone().resize({
      width,
      height: width,
      fit: 'inside',
      withoutEnlargement: true,
    })
    await Promise.all([
      resized.clone()
        .webp({ quality: 78, effort: 6, smartSubsample: true })
        .toFile(path.join(stagingRoot, responsiveOutputName(item.stem, width, 'webp'))),
      resized.clone()
        .avif({ quality: 52, effort: 6, chromaSubsampling: '4:2:0' })
        .toFile(path.join(stagingRoot, responsiveOutputName(item.stem, width, 'avif'))),
    ])
  }
}

async function validatedMetadata(file, expectedFormat) {
  const contents = await readFile(file)
  const metadata = await sharp(contents, { limitInputPixels: inputPixelLimit }).metadata()
  await sharp(contents, { limitInputPixels: inputPixelLimit }).resize(1, 1).raw().toBuffer()
  const validFormat = expectedFormat === 'webp'
    ? metadata.format === 'webp'
    : metadata.format === 'heif' && metadata.compression === 'av1'
  if (!validFormat) {
    const formatLabel = expectedFormat === 'webp' ? 'WebP' : 'AVIF'
    throw new Error(`Invalid staged ${formatLabel} format: ${path.basename(file)}`)
  }
  if (
    !metadata.width
    || !metadata.height
    || Math.max(metadata.width, metadata.height) > 1920
  ) {
    throw new Error(`Invalid staged image dimensions: ${path.basename(file)}`)
  }
  return metadata
}

export async function validateStagedAssets(stagingRoot, assets) {
  const expected = new Set(assets.flatMap(({ stem }) => (
    responsiveAssetWidths.flatMap((width) => [
      responsiveOutputName(stem, width, 'webp'),
      responsiveOutputName(stem, width, 'avif'),
    ])
  )))
  const files = await readdir(stagingRoot)
  if (files.length !== expected.size || files.some((file) => !expected.has(file))) {
    throw new Error(`Staged asset count mismatch: expected ${expected.size}, received ${files.length}`)
  }

  for (const item of assets) {
    for (const width of responsiveAssetWidths) {
      const webp = await validatedMetadata(
        path.join(stagingRoot, responsiveOutputName(item.stem, width, 'webp')),
        'webp',
      )
      const avif = await validatedMetadata(
        path.join(stagingRoot, responsiveOutputName(item.stem, width, 'avif')),
        'avif',
      )
      if (webp.width !== avif.width || webp.height !== avif.height) {
        throw new Error(`Staged asset dimensions do not match: ${item.stem} at ${width}px`)
      }
      if (Math.max(webp.width, webp.height) > width) {
        throw new Error(`Staged asset exceeds responsive width: ${item.stem} at ${width}px`)
      }
    }
  }
}

async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

function assertSafeSibling(outputRoot, candidate, suffix) {
  const outputParent = path.dirname(outputRoot)
  const resolvedCandidate = path.resolve(candidate)
  if (
    path.dirname(resolvedCandidate) !== outputParent
    || !path.basename(resolvedCandidate).startsWith(`${path.basename(outputRoot)}.${suffix}-`)
  ) {
    throw new Error(`Unsafe ${suffix} directory: ${resolvedCandidate}`)
  }
  return resolvedCandidate
}

async function removeSafeSibling(outputRoot, candidate, suffix) {
  const safeCandidate = assertSafeSibling(outputRoot, candidate, suffix)
  await rm(safeCandidate, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  })
}

async function publishStagedAssets(stagingRoot, outputRoot) {
  const backupRoot = assertSafeSibling(
    outputRoot,
    path.join(
      path.dirname(outputRoot),
      `${path.basename(outputRoot)}.backup-${process.pid}-${randomUUID()}`,
    ),
    'backup',
  )
  const hadPublishedOutput = await exists(outputRoot)
  let oldOutputMoved = false
  let stagingPublished = false

  try {
    if (hadPublishedOutput) {
      await rename(outputRoot, backupRoot)
      oldOutputMoved = true
    }
    await rename(stagingRoot, outputRoot)
    stagingPublished = true
    if (oldOutputMoved) {
      await removeSafeSibling(outputRoot, backupRoot, 'backup')
      oldOutputMoved = false
    }
  } catch (publishError) {
    const rollbackErrors = []
    if (stagingPublished) {
      try {
        await rename(outputRoot, stagingRoot)
        stagingPublished = false
      } catch (error) {
        rollbackErrors.push(error)
      }
    }
    if (oldOutputMoved) {
      try {
        await rename(backupRoot, outputRoot)
        oldOutputMoved = false
      } catch (error) {
        rollbackErrors.push(error)
      }
    }
    if (rollbackErrors.length) {
      throw new AggregateError(
        [publishError, ...rollbackErrors],
        'Project asset publication failed and rollback was incomplete',
      )
    }
    throw publishError
  }
}

export async function buildProjectAssets({
  manifest = projectAssetManifest,
  originalRoot = defaultRoots.originalRoot,
  editedRoot = defaultRoots.editedRoot,
  outputRoot = defaultRoots.outputRoot,
  encodeAsset = encodeProjectAsset,
  validateAssets = validateStagedAssets,
} = {}) {
  const assets = await preflightProjectAssets(manifest, { originalRoot, editedRoot })
  const resolvedOutputRoot = path.resolve(outputRoot)
  if (resolvedOutputRoot === path.parse(resolvedOutputRoot).root) {
    throw new Error('Project asset output cannot be a filesystem root')
  }

  const outputParent = path.dirname(resolvedOutputRoot)
  await mkdir(outputParent, { recursive: true })
  const stagingRoot = assertSafeSibling(
    resolvedOutputRoot,
    await mkdtemp(path.join(outputParent, `${path.basename(resolvedOutputRoot)}.staging-`)),
    'staging',
  )

  try {
    for (const item of assets) await encodeAsset(item, stagingRoot)
    await validateAssets(stagingRoot, assets)
    await publishStagedAssets(stagingRoot, resolvedOutputRoot)
    return assets.length
  } catch (error) {
    try {
      await removeSafeSibling(resolvedOutputRoot, stagingRoot, 'staging')
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `Project asset build failed and staging cleanup failed: ${error.message}`,
      )
    }
    throw error
  }
}

const isDirectRun = Boolean(
  process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url,
)

if (isDirectRun) {
  const count = await buildProjectAssets()
  console.log(`Built ${count} approved project assets at four responsive widths in WebP and AVIF.`)
}
