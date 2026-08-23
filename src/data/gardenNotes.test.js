import { gardenNotes } from './gardenNotes'

test('publishes three complete and honest garden notes', () => {
  expect(gardenNotes.map(({ title }) => title)).toEqual([
    '庭園排水',
    '樹木修剪',
    '假山水景養護',
  ])
  gardenNotes.forEach((note, index) => {
    expect(note.number).toBe(String(index + 1).padStart(2, '0'))
    expect(note.body.length).toBeGreaterThan(35)
    expect(note.alt.trim()).not.toBe('')
    expect(note.image).toEqual(expect.objectContaining({
      src: expect.stringMatching(/\.webp$/),
      avifSrc: expect.stringMatching(/\.avif$/),
    }))
  })
})
