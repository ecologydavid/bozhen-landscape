import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { media } from './projectMedia'

function descriptors(srcSet) {
  return srcSet.split(',').map((candidate) => {
    const [source, descriptor] = candidate.trim().split(/\s+/)
    return { source, width: Number.parseInt(descriptor, 10) }
  })
}

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
  const images = files.filter((file) => /\.(?:avif|webp)$/.test(file))
  expect(images).toHaveLength(208)
  expect(images.filter((file) => file.endsWith('.avif'))).toHaveLength(104)
  expect(images.filter((file) => file.endsWith('.webp'))).toHaveLength(104)
  expect(existsSync(resolve('src/assets/projects/responsive-media.json'))).toBe(true)
  for (const extension of ['avif', 'webp']) {
    for (const suffix of ['-480', '-768', '-1280', '']) {
      expect(files).toContain(`changhua-residence-01${suffix}.${extension}`)
    }
  }
})

test('describes every candidate with its decoded width and preserves landscape tiers', async () => {
  const root = resolve('src/assets/projects')
  const baseStems = readdirSync(root)
    .filter((file) => /\.webp$/.test(file) && !/-(?:480|768|1280)\.webp$/.test(file))
    .map((file) => file.replace(/\.webp$/, ''))
    .sort()

  expect(baseStems).toHaveLength(26)
  for (const stem of baseStems) {
    const resolved = media(`${stem}.webp`)
    for (const [format, srcSet] of [
      ['avif', resolved.avifSrcSet],
      ['webp', resolved.srcSet],
    ]) {
      const candidates = descriptors(srcSet)
      expect(candidates.map(({ width }) => width)).toEqual(
        [...new Set(candidates.map(({ width }) => width))].sort((left, right) => left - right),
      )
      for (const candidate of candidates) {
        const filename = candidate.source.split('/').at(-1)
        expect(filename.endsWith(`.${format}`)).toBe(true)
        const decoded = await sharp(resolve(root, filename)).metadata()
        expect(candidate.width, filename).toBe(decoded.width)
      }
    }
  }

  expect(descriptors(media('taoyuan-greenwall-01.webp').avifSrcSet).map(({ width }) => width)).toEqual([
    360,
    576,
    960,
    1440,
  ])
  expect(descriptors(media('changhua-residence-03.webp').avifSrcSet).map(({ width }) => width)).toEqual([
    480,
    768,
    1280,
    1920,
  ])
})
