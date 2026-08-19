import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { media } from './projectMedia'

test('resolves optimized project media and rejects missing assets', () => {
  expect(media('changhua-residence-01.webp')).toEqual(expect.objectContaining({
    src: expect.stringMatching(/\.webp$/),
    avifSrc: expect.stringMatching(/\.avif$/),
    srcSet: expect.stringMatching(/-480\.webp 480w,.*-768\.webp 768w,.*-1280\.webp 1280w,.*\.webp 1920w/),
    avifSrcSet: expect.stringMatching(/-480\.avif 480w,.*-768\.avif 768w,.*-1280\.avif 1280w,.*\.avif 1920w/),
  }))
  expect(() => media('missing-project.webp')).toThrow('Missing project media')
})

test('ships four responsive widths in both formats for every approved image', () => {
  const files = readdirSync(resolve('src/assets/projects')).sort()
  expect(files).toHaveLength(208)
  expect(files.filter((file) => file.endsWith('.avif'))).toHaveLength(104)
  expect(files.filter((file) => file.endsWith('.webp'))).toHaveLength(104)
  for (const extension of ['avif', 'webp']) {
    for (const suffix of ['-480', '-768', '-1280', '']) {
      expect(files).toContain(`changhua-residence-01${suffix}.${extension}`)
    }
  }
})
