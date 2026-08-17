import { access, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import convert from 'heic-convert'
import sharp from 'sharp'
import { projectAssetManifest } from './project-asset-manifest.mjs'

const originalRoot = path.resolve('workbench/landscape-originals')
const editedRoot = path.resolve('workbench/landscape-edited')
const outputRoot = path.resolve('src/assets/projects')

async function existingInput(folder, source) {
  const stem = path.parse(source).name
  const candidates = [
    path.join(editedRoot, folder, `${stem}.png`),
    path.join(editedRoot, folder, `${stem}.jpg`),
    path.join(originalRoot, folder, source),
  ]

  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      continue
    }
  }

  throw new Error(`Missing source asset: ${folder}/${source}`)
}

await mkdir(outputRoot, { recursive: true })

for (const item of projectAssetManifest) {
  const input = await existingInput(item.folder, item.source)
  const output = path.join(outputRoot, item.output)
  const source = path.extname(input).toLowerCase() === '.heic'
    ? await convert({ buffer: await readFile(input), format: 'JPEG', quality: 0.96 })
    : input

  await sharp(source, { unlimited: true })
    .rotate()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, effort: 5, smartSubsample: true })
    .toFile(output)
}

console.log(`Built ${projectAssetManifest.length} project assets.`)
