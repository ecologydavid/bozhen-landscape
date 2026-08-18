export function classifyCssBudget(css) {
  const fontFacePattern = /@font-face\s*{[\s\S]*?}/g
  const fontFaceBlocks = css.match(fontFacePattern) ?? []
  const inlineFontBytes = fontFaceBlocks.reduce((total, block) => total + [...block.matchAll(/url\(data:font\/woff2;base64,([^)]*)\)/g)]
    .reduce((bytes, [, data]) => bytes + Buffer.from(data, 'base64').length, 0), 0)
  const fontFaceCssBytes = fontFaceBlocks.reduce((total, block) => total + Buffer.byteLength(block), 0)
  const appCssBytes = Buffer.byteLength(css.replace(fontFacePattern, ''))

  return { appCssBytes, fontFaceCssBytes, inlineFontBytes }
}
