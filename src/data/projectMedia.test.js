import { media } from './projectMedia'

test('resolves optimized project media and rejects missing assets', () => {
  expect(media('changhua-residence-01.webp')).toEqual(expect.objectContaining({
    src: expect.stringMatching(/\.webp$/),
    avifSrc: expect.stringMatching(/\.avif$/),
  }))
  expect(() => media('missing-project.webp')).toThrow('Missing project media')
})
