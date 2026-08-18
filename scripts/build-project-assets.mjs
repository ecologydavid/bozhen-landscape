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
  if (!item.approved) {
    throw new Error(`Asset is not approved for public output: ${item.folder}/${item.source}`)
  }

  const input = await existingInput(item.folder, item.source)
  const source = path.extname(input).toLowerCase() === '.heic'
    ? await convert({ buffer: await readFile(input), format: 'JPEG', quality: 0.96 })
    : input

  const stem = path.parse(item.output).name
  const image = sharp(source, { unlimited: true })
    .rotate()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })

  await Promise.all([
    image.clone()
      .webp({ quality: 78, effort: 6, smartSubsample: true })
      .toFile(path.join(outputRoot, `${stem}.webp`)),
    image.clone()
      .avif({ quality: 52, effort: 6, chromaSubsampling: '4:2:0' })
      .toFile(path.join(outputRoot, `${stem}.avif`)),
  ])
}

console.log(`Built ${projectAssetManifest.length} approved project assets in WebP and AVIF.`)
