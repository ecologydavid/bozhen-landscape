import { collectSubsetCharacters } from '../../scripts/build-local-fonts.mjs'

test('includes authored CSS content glyphs in the local font subset', async () => {
  const characters = await collectSubsetCharacters()

  expect(characters).toContain('←')
  expect(characters).toContain('—')
})
