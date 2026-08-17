import { media } from './projectMedia'

test('resolves optimized project media and rejects missing assets', () => {
  expect(media('changhua-residence-01.webp')).toMatch(/\.webp$/)
  expect(() => media('missing-project.webp')).toThrow('Missing project media')
})
