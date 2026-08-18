import { collectSubsetCharacters, validateGeneratedFontCoverage } from '../../scripts/build-local-fonts.mjs'

test('includes authored CSS content glyphs in the local font subset', async () => {
  const characters = await collectSubsetCharacters()

  expect(characters).toContain('←')
  expect(characters).toContain('—')
})

test('verifies generated font files cover CSS content glyphs', async () => {
  await expect(validateGeneratedFontCoverage('←—')).resolves.toEqual([])
})
