import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { platform } from 'node:process'
import { afterEach, expect, test } from 'vitest'
import {
  buildProjectAssets,
  responsiveAssetWidths,
} from '../../scripts/build-project-assets.mjs'

const temporaryRoots = []

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => (
    rm(root, { recursive: true, force: true })
  )))
})

const roots = {
  originalRoot: path.resolve('workbench/landscape-originals'),
  editedRoot: path.resolve('workbench/landscape-edited'),
}

const validPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

async function snapshotDirectory(root) {
  const entries = await readdir(root, { withFileTypes: true })
  const snapshot = []
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile()) continue
    const contents = await readFile(path.join(root, entry.name))
    snapshot.push(`${entry.name}:${createHash('sha256').update(contents).digest('hex')}`)
  }
  return snapshot
}

async function createAtomicFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'yaosei-atomic-'))
  temporaryRoots.push(root)
  const originalRoot = path.join(root, 'originals')
  const editedRoot = path.join(root, 'edited')
  const outputRoot = path.join(root, 'public-assets')
  await Promise.all([
    mkdir(path.join(originalRoot, 'first'), { recursive: true }),
    mkdir(path.join(originalRoot, 'second'), { recursive: true }),
    mkdir(editedRoot, { recursive: true }),
    mkdir(outputRoot, { recursive: true }),
  ])
  await Promise.all([
    writeFile(path.join(originalRoot, 'first', 'valid.png'), validPng),
    writeFile(path.join(originalRoot, 'second', 'corrupt.png'), 'not an image'),
    writeFile(path.join(outputRoot, 'published.webp'), 'published-before-build'),
  ])
  return { root, originalRoot, editedRoot, outputRoot }
}

async function expectPublishedOutputUnchanged(fixture, before) {
  expect(await snapshotDirectory(fixture.outputRoot)).toEqual(before)
  const siblings = await readdir(path.dirname(fixture.outputRoot))
  const prefix = path.basename(fixture.outputRoot)
  expect(siblings.filter((name) => (
    name.startsWith(`${prefix}.staging-`) || name.startsWith(`${prefix}.backup-`)
  ))).toEqual([])
}

async function expectRejectedWithoutOutput(manifest, message) {
  const root = await mkdtemp(path.join(tmpdir(), 'yaosei-assets-'))
  temporaryRoots.push(root)
  const outputRoot = path.join(root, 'public-output')

  await expect(buildProjectAssets({
    manifest,
    outputRoot,
    ...roots,
  })).rejects.toThrow(message)
  await expect(access(outputRoot)).rejects.toThrow()
}

test('rejects source traversal before checking the filesystem', async () => {
  await expectRejectedWithoutOutput([{
    folder: 'garden',
    source: '../private.HEIC',
    output: 'garden.webp',
    approved: true,
  }], 'outside approved asset roots')
})

test('rejects duplicate public stems during preflight', async () => {
  await expectRejectedWithoutOutput([
    { folder: 'a', source: 'one.HEIC', output: 'same.webp', approved: true },
    { folder: 'b', source: 'two.HEIC', output: 'same.webp', approved: true },
  ], 'Duplicate project asset output stem: same')
})

test('requires approval to be the literal boolean true', async () => {
  await expectRejectedWithoutOutput([{
    folder: 'garden',
    source: 'one.HEIC',
    output: 'one.webp',
    approved: 'true',
  }], 'Asset is not approved for public output')
})

test('rejects a later unapproved asset without creating partial output', async () => {
  await expectRejectedWithoutOutput([
    { folder: 'a', source: 'one.HEIC', output: 'one.webp', approved: true },
    { folder: 'b', source: 'two.HEIC', output: 'two.webp', approved: false },
  ], 'Asset is not approved for public output: b/two.HEIC')
})

test('rejects a nested junction or symlink that escapes a canonical source root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yaosei-link-'))
  temporaryRoots.push(root)
  const originalRoot = path.join(root, 'originals')
  const editedRoot = path.join(root, 'edited')
  const outsideRoot = path.join(root, 'outside')
  const outputRoot = path.join(root, 'public-assets')
  await Promise.all([
    mkdir(originalRoot, { recursive: true }),
    mkdir(editedRoot, { recursive: true }),
    mkdir(outsideRoot, { recursive: true }),
  ])
  await writeFile(path.join(outsideRoot, 'private.png'), validPng)
  await symlink(
    outsideRoot,
    path.join(originalRoot, 'escape'),
    platform === 'win32' ? 'junction' : 'dir',
  )

  await expect(buildProjectAssets({
    manifest: [{
      folder: 'escape',
      source: 'private.png',
      output: 'private.webp',
      approved: true,
    }],
    originalRoot,
    editedRoot,
    outputRoot,
  })).rejects.toThrow('resolves outside canonical asset root')
  await expect(access(outputRoot)).rejects.toThrow()
})

test('keeps the published directory unchanged when a later image cannot encode', async () => {
  const fixture = await createAtomicFixture()
  const before = await snapshotDirectory(fixture.outputRoot)

  await expect(buildProjectAssets({
    manifest: [
      { folder: 'first', source: 'valid.png', output: 'first.webp', approved: true },
      { folder: 'second', source: 'corrupt.png', output: 'second.webp', approved: true },
    ],
    ...fixture,
  })).rejects.toThrow()

  await expectPublishedOutputUnchanged(fixture, before)
})

test('cleans staging after one format encoder fails', async () => {
  const fixture = await createAtomicFixture()
  const before = await snapshotDirectory(fixture.outputRoot)

  await expect(buildProjectAssets({
    manifest: [
      { folder: 'first', source: 'valid.png', output: 'first.webp', approved: true },
    ],
    ...fixture,
    encodeAsset: async (item, stagingRoot) => {
      await writeFile(path.join(stagingRoot, `${item.stem}.webp`), validPng)
      throw new Error('AVIF encoder failed')
    },
  })).rejects.toThrow('AVIF encoder failed')

  await expectPublishedOutputUnchanged(fixture, before)
})

test('keeps published output unchanged when staged formats fail validation', async () => {
  const fixture = await createAtomicFixture()
  const before = await snapshotDirectory(fixture.outputRoot)

  await expect(buildProjectAssets({
    manifest: [
      { folder: 'first', source: 'valid.png', output: 'first.webp', approved: true },
    ],
    ...fixture,
    encodeAsset: async (item, stagingRoot) => {
      await Promise.all(responsiveAssetWidths.flatMap((width) => {
        const suffix = width === 1920 ? '' : `-${width}`
        return [
          writeFile(path.join(stagingRoot, `${item.stem}${suffix}.webp`), validPng),
          writeFile(path.join(stagingRoot, `${item.stem}${suffix}.avif`), validPng),
        ]
      }))
    },
  })).rejects.toThrow('Invalid staged WebP format')

  await expectPublishedOutputUnchanged(fixture, before)
})

test('publishes four responsive widths in both formats and removes every swap directory on success', async () => {
  const fixture = await createAtomicFixture()

  await expect(buildProjectAssets({
    manifest: [
      { folder: 'first', source: 'valid.png', output: 'first.webp', approved: true },
    ],
    ...fixture,
  })).resolves.toBe(1)

  expect((await readdir(fixture.outputRoot)).sort()).toEqual([
    'first-1280.avif',
    'first-1280.webp',
    'first-480.avif',
    'first-480.webp',
    'first-768.avif',
    'first-768.webp',
    'first.avif',
    'first.webp',
  ])
  const siblings = await readdir(path.dirname(fixture.outputRoot))
  const prefix = path.basename(fixture.outputRoot)
  expect(siblings.filter((name) => (
    name.startsWith(`${prefix}.staging-`) || name.startsWith(`${prefix}.backup-`)
  ))).toEqual([])
})
