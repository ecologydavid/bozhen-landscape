import { siteContent } from './siteContent'
import { statSync } from 'node:fs'
import { resolve } from 'node:path'

test('stores the official Yao Sei brand and direct contact details', () => {
  expect(siteContent.brand).toMatchObject({
    name: '曜聖景觀有限公司',
    shortName: '曜聖景觀',
    contactPerson: '葉柏鎮',
    englishName: 'YAO SEI LIMITED COMPANY',
  })
  expect(siteContent.contact).toMatchObject({
    mobile: '0921-047-049',
    office: '04-8750911',
    fax: '04-8758069',
    taxId: '00111874',
    email: 'a74964163285@gmail.com',
    address: '彰化縣田中鎮大社路一段702巷109號2F',
    lineId: '0921047049',
    phoneHref: 'tel:+886921047049',
    officeHref: 'tel:+88648750911',
    emailHref: 'mailto:a74964163285@gmail.com',
    lineHref: 'https://line.me/ti/p/~0921047049',
  })
  expect(siteContent.hero).toMatchObject({
    title: '把自然，安放進日常',
    description: '庭園設計・植栽綠化・假山水景・後續養護',
    alt: '彰化私人住宅庭園實景',
  })
  expect(siteContent.hero.image).toEqual(expect.objectContaining({
    src: expect.stringMatching(/\.webp$/),
    avifSrc: expect.stringMatching(/\.avif$/),
  }))
  expect(siteContent.hero.videoSrc).toMatchObject({
    desktop: expect.stringMatching(/nantun-water-garden\.mp4$/),
    mobile: expect.stringMatching(/nantun-water-garden-mobile\.mp4$/),
  })
})

test('keeps the approved mobile hero film materially smaller than the desktop source', () => {
  const desktop = statSync(resolve('src/assets/hero/nantun-water-garden.mp4'))
  const mobile = statSync(resolve('src/assets/hero/nantun-water-garden-mobile.mp4'))

  expect(mobile.size).toBeLessThan(desktop.size * 0.6)
})

test('serves a compact WebP logo while retaining the printed brand artwork', () => {
  expect(siteContent.brand.logoSrc).toMatch(/yaosei-logo-compact\.webp$/)
})
