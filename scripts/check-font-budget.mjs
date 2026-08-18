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
  fontAssets: 7,
  fontBytes: 550_000,
  cssBytes: 35_000,
}

if (fontFiles.length !== budget.fontAssets || fontBytes > budget.fontBytes || cssBytes > budget.cssBytes) {
  throw new Error(`Font budget exceeded: ${fontFiles.length} assets / ${fontBytes} bytes; CSS ${cssBytes} bytes. Budget: ${budget.fontAssets} assets / ${budget.fontBytes} bytes; CSS ${budget.cssBytes} bytes.`)
}

console.log(`Font budget passed: ${fontFiles.length} assets / ${fontBytes} bytes; CSS ${cssBytes} bytes.`)
