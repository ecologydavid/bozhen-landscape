import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { buildProjectAssets } from '../../scripts/build-project-assets.mjs'

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
