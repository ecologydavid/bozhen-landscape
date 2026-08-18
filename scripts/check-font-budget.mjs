import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { classifyCssBudget } from './font-budget.mjs'

const assetsRoot = path.resolve('dist/assets')
const fontFiles = (await readdir(assetsRoot)).filter((fileName) => fileName.endsWith('.woff2'))
const cssFiles = (await readdir(assetsRoot)).filter((fileName) => fileName.endsWith('.css'))
const fontBytes = (await Promise.all(fontFiles.map(async (fileName) => (await stat(path.join(assetsRoot, fileName))).size)))
  .reduce((sum, size) => sum + size, 0)
const css = (await Promise.all(cssFiles.map((fileName) => readFile(path.join(assetsRoot, fileName), 'utf8')))).join('')
const { appCssBytes, fontFaceCssBytes, inlineFontBytes } = classifyCssBudget(css)
const totalFontBytes = fontBytes + inlineFontBytes

const budget = {
  minFontAssets: 7,
  maxFontAssets: 10,
  externalFontBytes: 600_000,
  inlineFontBytes: 30_000,
  fontFaceCssBytes: 65_000,
  appCssBytes: 150_000,
}

if (fontFiles.length < budget.minFontAssets || fontFiles.length > budget.maxFontAssets || fontBytes > budget.externalFontBytes || inlineFontBytes > budget.inlineFontBytes || fontFaceCssBytes > budget.fontFaceCssBytes || appCssBytes > budget.appCssBytes) {
  throw new Error(`Font budget exceeded: ${fontFiles.length} external assets / ${fontBytes} external bytes / ${inlineFontBytes} inline bytes / ${fontFaceCssBytes} font-face CSS bytes / ${appCssBytes} app CSS bytes. Budget: ${budget.minFontAssets}-${budget.maxFontAssets} assets / ${budget.externalFontBytes} external bytes / ${budget.inlineFontBytes} inline bytes / ${budget.fontFaceCssBytes} font-face CSS bytes / ${budget.appCssBytes} app CSS bytes.`)
}

console.log(`Font budget passed: ${fontFiles.length} external assets / ${fontBytes} external bytes / ${inlineFontBytes} inline bytes / ${totalFontBytes} total font bytes / ${fontFaceCssBytes} font-face CSS bytes / ${appCssBytes} app CSS bytes.`)
