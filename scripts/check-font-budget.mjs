import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const assetsRoot = path.resolve('dist/assets')
const fontFiles = (await readdir(assetsRoot)).filter((fileName) => fileName.endsWith('.woff2'))
const cssFiles = (await readdir(assetsRoot)).filter((fileName) => fileName.endsWith('.css'))
const fontBytes = (await Promise.all(fontFiles.map(async (fileName) => (await stat(path.join(assetsRoot, fileName))).size)))
  .reduce((sum, size) => sum + size, 0)
const cssBytes = (await Promise.all(cssFiles.map(async (fileName) => (await stat(path.join(assetsRoot, fileName))).size)))
  .reduce((sum, size) => sum + size, 0)

const budget = {
  minFontAssets: 7,
  maxFontAssets: 10,
  fontBytes: 600_000,
  cssBytes: 75_000,
}

if (fontFiles.length < budget.minFontAssets || fontFiles.length > budget.maxFontAssets || fontBytes > budget.fontBytes || cssBytes > budget.cssBytes) {
  throw new Error(`Font budget exceeded: ${fontFiles.length} assets / ${fontBytes} bytes; CSS ${cssBytes} bytes. Budget: ${budget.minFontAssets}-${budget.maxFontAssets} assets / ${budget.fontBytes} bytes; CSS ${budget.cssBytes} bytes.`)
}

console.log(`Font budget passed: ${fontFiles.length} assets / ${fontBytes} bytes; CSS ${cssBytes} bytes.`)
