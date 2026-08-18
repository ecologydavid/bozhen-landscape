import { classifyCssBudget } from '../../scripts/font-budget.mjs'

test('separates inline font payloads and font-face declarations from application CSS', () => {
  const css = [
    '@font-face { font-family: Test; src: url(data:font/woff2;base64,QUJD) format(\'woff2\'); }',
    '.scene { color: green; }',
  ].join('\n')

  const result = classifyCssBudget(css)

  expect(result.inlineFontBytes).toBe(3)
  expect(result.fontFaceCssBytes).toBeGreaterThan(3)
  expect(result.appCssBytes).toBe(globalThis.Buffer.byteLength('\n.scene { color: green; }'))
})
