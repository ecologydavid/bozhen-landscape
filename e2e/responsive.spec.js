import { expect, test } from '@playwright/test'
import sharp from 'sharp'

const pagesBasePath = '/bozhen-landscape/'
const homeUrl = './#/'

const viewports = [
  { name: 'compact-320', width: 320, height: 720 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-560', width: 560, height: 900 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-handoff-769', width: 769, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'wide-1920', width: 1920, height: 1080 },
]

const productionRoutes = [
  { url: homeUrl, heading: '把自然，安放進日常' },
  { url: './#/projects', heading: '讓作品，說明我們如何對待每一處風景' },
  { url: './#/projects/taichung-garden-maintenance', heading: '台中日式庭園修剪維護' },
]

const scenes = [
  { id: 'plant', heading: '把自然，安放進日常' },
  { id: 'stone', heading: '作品，是最直接的回答' },
  { id: 'water', heading: '以專業工法，完成自然的尺度' },
  { id: 'craft', heading: '從理解現場，到風景落成' },
  { id: 'care', heading: '直接與曜聖聯絡' },
]

function watchPageHealth(page) {
  const issues = []
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    issues.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) issues.push(`response: ${response.status()} ${response.url()}`)
  })
  return issues
}

async function expectHealthyProductionPage(page, route) {
  const issues = watchPageHealth(page)
  await page.goto(route.url, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: route.heading })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe(pagesBasePath)
  expect(issues, issues.join('\n')).toEqual([])
}

async function expectContactPairToFit(pair) {
  const links = pair.locator('.leaf-contact-links__item')
  await expect(links).toHaveCount(2)

  for (let index = 0; index < await links.count(); index += 1) {
    const geometry = await links.nth(index).evaluate((anchor) => {
      const label = anchor.querySelector(':scope > span')
      if (!label) return null
      const anchorRect = anchor.getBoundingClientRect()
      const labelRect = label.getBoundingClientRect()
      return {
        anchor: {
          top: anchorRect.top,
          right: anchorRect.right,
          bottom: anchorRect.bottom,
          left: anchorRect.left,
          clientWidth: anchor.clientWidth,
          scrollWidth: anchor.scrollWidth,
        },
        label: {
          top: labelRect.top,
          right: labelRect.right,
          bottom: labelRect.bottom,
          left: labelRect.left,
          clientWidth: label.clientWidth,
          scrollWidth: label.scrollWidth,
        },
        whiteSpace: getComputedStyle(label).whiteSpace,
      }
    })

    expect(geometry).not.toBeNull()
    expect(geometry.whiteSpace).toBe('nowrap')
    expect(geometry.anchor.right - geometry.anchor.left).toBeGreaterThan(0)
    expect(geometry.label.right - geometry.label.left).toBeGreaterThan(0)
    expect(geometry.anchor.scrollWidth).toBeLessThanOrEqual(geometry.anchor.clientWidth + 1)
    expect(geometry.label.scrollWidth).toBeLessThanOrEqual(geometry.label.clientWidth + 1)
    expect(geometry.label.left).toBeGreaterThanOrEqual(geometry.anchor.left - 1)
    expect(geometry.label.right).toBeLessThanOrEqual(geometry.anchor.right + 1)
    expect(geometry.label.top).toBeGreaterThanOrEqual(geometry.anchor.top - 1)
    expect(geometry.label.bottom).toBeLessThanOrEqual(geometry.anchor.bottom + 1)
  }
}

async function expectVisibleContactPairToFit(page) {
  const pairs = page.locator('.leaf-contact-links:visible')
  expect(await pairs.count()).toBeGreaterThanOrEqual(1)

  for (let pairIndex = 0; pairIndex < await pairs.count(); pairIndex += 1) {
    await expectContactPairToFit(pairs.nth(pairIndex))
  }
}

async function expectOrganicStoneSproutContactPair(page, pair) {
  await expect(pair).toHaveClass(/leaf-contact-links--stone-sprout/)
  await expectContactPairToFit(pair)

  const geometry = await pair.evaluate((node) => {
    const pairRect = node.getBoundingClientRect()
    const stem = getComputedStyle(node, '::after')
    const stemTop = pairRect.top + Number.parseFloat(stem.top)
    const stemBottom = pairRect.bottom - Number.parseFloat(stem.bottom)
    const stemX = pairRect.left + Number.parseFloat(stem.left)
    const links = Array.from(node.querySelectorAll('.leaf-contact-links__item')).map((link) => {
      const rect = link.getBoundingClientRect()
      const label = link.querySelector(':scope > span:not(.leaf-contact-links__arrow)')
      const labelRect = label?.getBoundingClientRect()
      return {
        height: rect.height,
        width: rect.width,
        label: labelRect && {
          top: labelRect.top,
          right: labelRect.right,
          bottom: labelRect.bottom,
          left: labelRect.left,
        },
      }
    })
    const stemCrossesLabel = links.some(({ label }) => label
      && stemX >= label.left
      && stemX <= label.right
      && stemBottom >= label.top
      && stemTop <= label.bottom)

    return {
      pairWidth: pairRect.width,
      pairOverflow: node.scrollWidth - node.clientWidth,
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      stem: {
        leftRatio: Number.parseFloat(stem.left) / pairRect.width,
        pointerEvents: stem.pointerEvents,
        zIndex: stem.zIndex,
      },
      stemCrossesLabel,
      links,
    }
  })

  expect(geometry.stem.leftRatio).toBeCloseTo(0.57, 2)
  expect(geometry.stem.zIndex).toBe('2')
  expect(geometry.stem.pointerEvents).toBe('none')
  expect(geometry.pairOverflow).toBeLessThanOrEqual(1)
  expect(geometry.documentOverflow).toBeLessThanOrEqual(1)
  expect(geometry.stemCrossesLabel).toBe(false)
  expect(geometry.links).toHaveLength(2)
  for (const link of geometry.links) {
    expect(link.width).toBeGreaterThanOrEqual(56)
    expect(link.height).toBeGreaterThanOrEqual(56)
  }

  const phone = pair.getByRole('link', { name: '撥打 0921-047-049' })
  await phone.focus()
  await expect(phone).toBeFocused()
  await expect(phone).toHaveCSS('outline-width', '3px')
  await expect(phone).toHaveCSS('outline-style', 'solid')
  await expect(phone).toHaveCSS('outline-color', 'rgb(54, 90, 69)')
}

async function expectFooterVisibleAndUncovered(page, viewport) {
  const footer = page.locator('.site-footer')
  const regions = [
    footer.locator('.site-footer__brand'),
    footer.locator('.site-footer__services'),
    footer.locator('.site-footer__links'),
    footer.locator('.site-footer__contact'),
    footer.locator('.site-footer__bottom'),
  ]

  for (const region of regions) {
    await region.scrollIntoViewIfNeeded()
    await expect(region).toBeVisible()
  }

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const footerBottom = footer.locator('.site-footer__bottom')
  await expect(footerBottom).toBeVisible()
  await expect(footerBottom.locator('small')).toHaveCount(1)

  if (viewport.width <= 768) {
    const overlap = await page.evaluate(() => {
      const bar = document.querySelector('.mobile-contact-bar')?.getBoundingClientRect()
      const bottom = document.querySelector('.site-footer__bottom')?.getBoundingClientRect()
      if (!bar || !bottom) return null
      return Math.min(bar.bottom, bottom.bottom) - Math.max(bar.top, bottom.top)
    })
    expect(overlap).not.toBeNull()
    expect(overlap).toBeLessThanOrEqual(0)
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  const footerImage = await footer.screenshot({ animations: 'disabled' })
  const { data, info } = await sharp(footerImage).raw().toBuffer({ resolveWithObject: true })
  const expectedForest = [24, 34, 28]
  const sampleRegions = [
    { x: 8, y: 32 },
    { x: info.width - 9, y: 32 },
    { x: 8, y: Math.floor(info.height * 0.45) },
    { x: info.width - 9, y: Math.floor(info.height * 0.45) },
    { x: 2, y: info.height - 32 },
    { x: info.width - 3, y: info.height - 32 },
  ]

  for (const sample of sampleRegions) {
    let forestPixels = 0
    let sampledPixels = 0
    for (let y = sample.y - 1; y <= sample.y + 1; y += 1) {
      for (let x = sample.x - 1; x <= sample.x + 1; x += 1) {
        const offset = (y * info.width + x) * info.channels
        const sampledForest = [data[offset], data[offset + 1], data[offset + 2]]
        const greatestChannelDelta = Math.max(
          ...sampledForest.map((channel, index) => Math.abs(channel - expectedForest[index])),
        )
        if (greatestChannelDelta <= 8) forestPixels += 1
        sampledPixels += 1
      }
    }
    expect(forestPixels / sampledPixels).toBeGreaterThanOrEqual(0.85)
  }

  const footerBottomContrast = await footerBottom.locator('small').evaluate((node) => {
    const parseColor = (value) => value.match(/[\d.]+/g).map(Number)
    const foreground = parseColor(getComputedStyle(node).color)
    const background = parseColor(getComputedStyle(node.closest('.site-footer')).backgroundColor)
    const alpha = foreground[3] ?? 1
    const composite = foreground.slice(0, 3).map(
      (channel, index) => channel * alpha + background[index] * (1 - alpha),
    )
    const relativeLuminance = (color) => color.reduce((sum, channel, index) => {
      const srgb = channel / 255
      const linear = srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
      return sum + linear * [0.2126, 0.7152, 0.0722][index]
    }, 0)
    const lighter = Math.max(relativeLuminance(composite), relativeLuminance(background))
    const darker = Math.min(relativeLuminance(composite), relativeLuminance(background))
    return {
      background: getComputedStyle(node.closest('.site-footer')).backgroundColor,
      color: getComputedStyle(node).color,
      contrast: (lighter + 0.05) / (darker + 0.05),
    }
  })
  expect(footerBottomContrast.contrast).toBeGreaterThanOrEqual(4.5)
}

for (const route of productionRoutes) {
  test(`${route.url} loads from the production Pages mount without runtime or asset failures`, async ({ page }) => {
    await expectHealthyProductionPage(page, route)
  })
}

for (const viewport of viewports) {
  for (const route of productionRoutes) {
    test(`${route.url} paints the complete Footer above the scene at ${viewport.name}`, async ({ page }) => {
      const issues = watchPageHealth(page)
      await page.setViewportSize(viewport)
      await page.goto(route.url, { waitUntil: 'networkidle' })

      await expectFooterVisibleAndUncovered(page, viewport)
      expect(issues, issues.join('\n')).toEqual([])
    })
  }
}

for (const viewport of viewports) {
  test(`${viewport.name} has no horizontal overflow`, async ({ page }) => {
    const issues = watchPageHealth(page)
    await page.setViewportSize(viewport)
    await page.goto(homeUrl, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: '把自然，安放進日常' })).toBeVisible()
    expect(new URL(page.url()).pathname).toBe(pagesBasePath)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    const heroGeometry = await page.evaluate(() => {
      const media = document.querySelector('.hero__media')?.getBoundingClientRect()
      const image = document.querySelector('.hero__image')?.getBoundingClientRect()
      const copy = document.querySelector('.hero__copy')?.getBoundingClientRect()
      const contact = document.querySelector('.hero__contact')?.getBoundingClientRect()
      const actions = document.querySelector('.hero__actions')?.getBoundingClientRect()
      if (!media || !image || !copy || !contact || !actions) return null
      return {
        media: { top: media.top, right: media.right, bottom: media.bottom, left: media.left },
        image: { top: image.top, right: image.right, bottom: image.bottom, left: image.left },
        copy: { top: copy.top, right: copy.right, bottom: copy.bottom, left: copy.left },
        contact: { top: contact.top, right: contact.right, bottom: contact.bottom, left: contact.left },
        actions: { top: actions.top, bottom: actions.bottom },
      }
    })

    expect(heroGeometry).not.toBeNull()
    expect(Math.abs(heroGeometry.image.left - heroGeometry.media.left)).toBeLessThanOrEqual(1)
    expect(Math.abs(heroGeometry.image.right - heroGeometry.media.right)).toBeLessThanOrEqual(1)
    expect(Math.abs(heroGeometry.image.top - heroGeometry.media.top)).toBeLessThanOrEqual(1)
    expect(Math.abs(heroGeometry.image.bottom - heroGeometry.media.bottom)).toBeLessThanOrEqual(1)
    const heroOverlapX = Math.min(heroGeometry.copy.right, heroGeometry.contact.right)
      - Math.max(heroGeometry.copy.left, heroGeometry.contact.left)
    const heroOverlapY = Math.min(heroGeometry.copy.bottom, heroGeometry.contact.bottom)
      - Math.max(heroGeometry.copy.top, heroGeometry.contact.top)
    expect(heroOverlapX > 1 && heroOverlapY > 1).toBe(false)
    expect(heroGeometry.copy.bottom).toBeLessThanOrEqual(heroGeometry.actions.top + 1)

    if (viewport.width <= 768) {
      expect(heroGeometry.copy.top).toBeGreaterThanOrEqual(heroGeometry.media.top - 1)
      expect(heroGeometry.copy.bottom).toBeLessThanOrEqual(heroGeometry.media.bottom + 1)
      expect(heroGeometry.media.bottom).toBeLessThanOrEqual(heroGeometry.contact.top + 1)
      await page.locator('#services').scrollIntoViewIfNeeded()
      await expect(page.locator('.mobile-contact-bar')).toHaveClass(/is-visible/)
    }

    await expectVisibleContactPairToFit(page)
    expect(issues, issues.join('\n')).toEqual([])
  })
}

test('mobile menu is full, refined, focus-trapped, and closeable', async ({ page }) => {
  const issues = watchPageHealth(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })
  const toggle = page.getByRole('button', { name: '開啟選單' })
  const navigation = page.getByRole('navigation', { name: '主要導覽' })
  const firstLink = navigation.getByRole('link', { name: '作品案例' })
  const lastLink = navigation.getByRole('link', { name: '撥打 0921-047-049' })

  await toggle.click()
  await expect(navigation).toHaveClass(/is-open/)
  await expect(firstLink).toBeFocused()
  await expect(navigation.getByRole('link', { name: 'LINE 聯絡' })).toBeVisible()
  await expect(lastLink).toBeVisible()
  await expect(navigation.getByRole('img', { name: '導覽中的彰化私人住宅庭園實景' })).toBeVisible()

  const drawerRect = await navigation.boundingBox()
  expect(drawerRect).not.toBeNull()
  expect(drawerRect.x).toBeGreaterThanOrEqual(0)
  expect(drawerRect.y).toBeGreaterThanOrEqual(0)
  expect(drawerRect.x + drawerRect.width).toBeLessThanOrEqual(390)
  expect(drawerRect.y + drawerRect.height).toBeLessThanOrEqual(844)

  await page.keyboard.press('Shift+Tab')
  await expect(lastLink).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(firstLink).toBeFocused()

  await page.getByRole('button', { name: '關閉主要導覽' }).click()
  await expect(navigation).not.toHaveClass(/is-open/)
  await expect(toggle).toBeFocused()
  await expect(page.locator('body')).not.toHaveClass(/nav-open/)

  await toggle.click()
  await expect(firstLink).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(toggle).toBeFocused()
  await expect(page.locator('body')).not.toHaveClass(/nav-open/)
  expect(issues, issues.join('\n')).toEqual([])
})

test('reduced motion moves focus into the painted mobile drawer', async ({ page }) => {
  const issues = watchPageHealth(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })

  const navigation = page.getByRole('navigation', { name: '主要導覽' })
  const firstLink = navigation.getByRole('link', { name: '作品案例' })
  await page.getByRole('button', { name: '開啟選單' }).click()

  await expect(navigation).toHaveClass(/is-open/)
  await expect(firstLink).toBeVisible()
  await expect(firstLink).toBeFocused()
  expect(issues, issues.join('\n')).toEqual([])
})

test('resizing an open drawer from 768px to 769px restores desktop interaction', async ({ page }) => {
  const issues = watchPageHealth(page)
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })

  const content = page.locator('.site-content')
  const navigation = page.getByRole('navigation', { name: '主要導覽' })
  await page.getByRole('button', { name: '開啟選單' }).click()
  await expect(navigation).toHaveClass(/is-open/)
  await expect(content).toHaveAttribute('inert', '')
  await expect(content).toHaveAttribute('aria-hidden', 'true')

  await page.setViewportSize({ width: 769, height: 1024 })

  await expect(navigation).not.toHaveClass(/is-open/)
  await expect(page.locator('body')).not.toHaveClass(/nav-open/)
  await expect(content).not.toHaveAttribute('inert')
  await expect(content).not.toHaveAttribute('aria-hidden')
  const mainLink = page.locator('main a').first()
  await mainLink.focus()
  await expect(mainLink).toBeFocused()
  await expect(page.locator('.nav-toggle')).not.toBeFocused()
  expect(issues, issues.join('\n')).toEqual([])
})

test('mobile drawer boundary preserves 82px rows and initially visible contacts', async ({ page }) => {
  const issues = watchPageHealth(page)

  for (const { height, compact } of [
    { height: 568, compact: true },
    { height: 720, compact: true },
    { height: 768, compact: true },
    { height: 769, compact: false },
    { height: 800, compact: false },
  ]) {
    await page.setViewportSize({ width: 320, height })
    await page.goto(homeUrl, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: '開啟選單' }).click()

    const navigation = page.getByRole('navigation', { name: '主要導覽' })
    const visual = navigation.locator('.site-nav__visual')
    const contacts = [
      navigation.getByRole('link', { name: 'LINE 聯絡' }),
      navigation.getByRole('link', { name: '撥打 0921-047-049' }),
    ]
    const drawerRect = await navigation.boundingBox()
    const rowMetrics = await navigation.locator('.site-nav__item').evaluateAll((rows) => (
      rows.map((row) => ({
        height: row.getBoundingClientRect().height,
        minHeight: getComputedStyle(row).minHeight,
      }))
    ))

    expect(drawerRect).not.toBeNull()
    expect(await navigation.evaluate((node) => node.scrollTop)).toBe(0)
    expect(rowMetrics).toHaveLength(4)
    for (const row of rowMetrics) {
      expect(row.minHeight).toBe('82px')
      expect(row.height).toBeGreaterThanOrEqual(82)
    }
    await expect(visual).toHaveCSS('display', compact ? 'none' : 'grid')
    for (const contact of contacts) {
      const contactRect = await contact.boundingBox()
      expect(contactRect).not.toBeNull()
      expect(contactRect.y).toBeGreaterThanOrEqual(drawerRect.y)
      expect(contactRect.y + contactRect.height).toBeLessThanOrEqual(
        drawerRect.y + drawerRect.height,
      )
    }
    await page.keyboard.press('Escape')
  }

  expect(issues, issues.join('\n')).toEqual([])
})

test('navigation image fallback keeps one visible tagline without text overlap', async ({ page }) => {
  const issues = watchPageHealth(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '開啟選單' }).click()

  const navigation = page.getByRole('navigation', { name: '主要導覽' })
  const image = navigation.locator('.site-nav__visual img')
  await image.dispatchEvent('error')
  await expect(image).toHaveCount(1)
  await image.dispatchEvent('error')

  const fallback = navigation.getByRole('img', {
    name: '導覽中的彰化私人住宅庭園實景（圖片暫時無法顯示）',
  })
  const tagline = navigation.locator('.site-nav__visual > span')
  await expect(fallback).toBeVisible()
  await expect(tagline).toBeVisible()
  await expect(fallback.locator('span')).toBeHidden()
  await expect(fallback.locator('strong')).toBeHidden()

  const visibleInternalTextRects = await fallback.locator('span, strong').evaluateAll((nodes) => (
    nodes.flatMap((node) => {
      const style = getComputedStyle(node)
      const rect = node.getBoundingClientRect()
      return style.visibility === 'visible' && rect.width > 0 && rect.height > 0
        ? [{ top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }]
        : []
    })
  ))
  expect(visibleInternalTextRects).toEqual([])
  expect(issues, issues.join('\n')).toEqual([])
})

test('browser back closes an open menu, restores content, and focuses the returned route', async ({ page }) => {
  const issues = watchPageHealth(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })
  await page.goto('./#/projects', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '開啟選單' }).click()

  const content = page.locator('.site-content')
  await expect(content).toHaveAttribute('inert', '')
  await expect(content).toHaveAttribute('aria-hidden', 'true')
  await page.evaluate(() => document.querySelector('main a')?.focus())
  await expect(page.getByRole('link', { name: '作品案例' })).toBeFocused()

  await page.goBack({ waitUntil: 'networkidle' })

  await expect(page).toHaveURL(/#\/$/)
  await expect(page.locator('#primary-navigation')).not.toHaveClass(/is-open/)
  await expect(content).not.toHaveAttribute('inert')
  await expect(content).not.toHaveAttribute('aria-hidden')
  await expect(page.locator('main')).toBeFocused()
  await expect(page.getByRole('button', { name: '開啟選單' })).not.toBeFocused()
  expect(issues, issues.join('\n')).toEqual([])
})

for (const width of [360, 768]) {
  test(`${width}px Hero keeps direct leaf contacts while the fixed bar waits below the fold`, async ({ page }) => {
    const issues = watchPageHealth(page)
    await page.setViewportSize({ width, height: width === 360 ? 800 : 1024 })
    await page.goto(homeUrl, { waitUntil: 'networkidle' })

    const heroContacts = page.locator('.hero__actions .leaf-contact-links')
    await expect(heroContacts).toBeVisible()
    await expect(heroContacts.getByRole('link', { name: 'LINE 聯絡' })).toBeVisible()
    await expect(heroContacts.getByRole('link', { name: '撥打 0921-047-049' })).toBeVisible()
    await expect(page.locator('.mobile-contact-bar')).not.toHaveClass(/is-visible/)
    await expect(page.locator('.mobile-contact-bar')).toHaveAttribute('aria-hidden', 'true')
    await expectVisibleContactPairToFit(page)

    await page.locator('#services').scrollIntoViewIfNeeded()
    await expect(page.locator('.mobile-contact-bar')).toHaveClass(/is-visible/)
    expect(issues, issues.join('\n')).toEqual([])
  })
}

test('390px Hero film and adaptive contact surfaces preserve their complete mobile contract', async ({ page }) => {
  const issues = watchPageHealth(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })

  const heroVideo = page.locator('.hero__video')
  await expect(heroVideo).toBeVisible()
  await expect.poll(() => heroVideo.evaluate((video) => video.readyState)).toBeGreaterThanOrEqual(2)
  const playbackStart = await heroVideo.evaluate((video) => ({
    currentTime: video.currentTime,
    paused: video.paused,
  }))
  expect(playbackStart.paused).toBe(false)
  await expect.poll(() => heroVideo.evaluate((video) => video.currentTime)).toBeGreaterThan(
    playbackStart.currentTime + 0.1,
  )
  await expect(heroVideo).toHaveJSProperty('muted', true)
  await expect(heroVideo).toHaveJSProperty('autoplay', true)
  await expect(heroVideo).toHaveJSProperty('loop', true)
  await expect(heroVideo).toHaveJSProperty('playsInline', true)
  await expect(heroVideo).not.toHaveAttribute('poster')
  await expect(heroVideo).toHaveJSProperty('poster', '')
  await expect(heroVideo).toHaveAttribute('preload', 'metadata')

  const heroPair = page.locator('.hero__actions .leaf-contact-links')
  await expect(heroPair).toHaveClass(/leaf-contact-links--stone-sprout/)
  await expectContactPairToFit(heroPair)

  await page.locator('#services').scrollIntoViewIfNeeded()
  const mobileBar = page.locator('.mobile-contact-bar')
  await expect(mobileBar).toHaveClass(/is-visible/)
  const mobilePair = mobileBar.locator('.leaf-contact-links')
  await expect(mobilePair).toHaveClass(/leaf-contact-links--mobile/)
  await expect(mobilePair).toHaveClass(/leaf-contact-links--stone-sprout/)
  await expectContactPairToFit(mobilePair)

  const footer = page.locator('.site-footer')
  await footer.scrollIntoViewIfNeeded()
  await expect(footer.getByText(/統一編號\s*00111874/)).toHaveCount(0)
  const contact = page.getByRole('region', { name: '直接與曜聖聯絡' })
  await contact.scrollIntoViewIfNeeded()
  await expect(contact.getByText('統一編號', { exact: true })).toBeVisible()
  await expect(contact.getByText('00111874', { exact: true })).toBeVisible()
  expect(issues, issues.join('\n')).toEqual([])
})

test('390px Save-Data keeps the Hero static without fetching the film', async ({ page }) => {
  const filmRequests = []
  page.on('request', (request) => {
    if (request.url().includes('nantun-water-garden')) filmRequests.push(request.url())
  })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })

  await expect(page.locator('.hero__image')).toBeVisible()
  await expect(page.locator('.hero__video')).toHaveCount(0)
  expect(filmRequests).toEqual([])
})

for (const width of [320, 390]) {
  test(`${width}px stone-and-sprout contact pairs keep their organic stem out of link text`, async ({ page }) => {
    const issues = watchPageHealth(page)
    await page.setViewportSize({ width, height: width === 320 ? 720 : 844 })
    await page.goto(homeUrl, { waitUntil: 'networkidle' })

    await expectOrganicStoneSproutContactPair(
      page,
      page.locator('.hero__actions .leaf-contact-links'),
    )

    await page.locator('#services').scrollIntoViewIfNeeded()
    const mobileBar = page.locator('.mobile-contact-bar')
    await expect(mobileBar).toHaveClass(/is-visible/)
    await expectOrganicStoneSproutContactPair(
      page,
      mobileBar.locator('.leaf-contact-links'),
    )
    expect(issues, issues.join('\n')).toEqual([])
  })
}

test('craft-to-care bridge remains continuous across its internal section boundary', async ({ page }) => {
  const issues = watchPageHealth(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })
  const bridge = page.locator('[data-transition="craft-to-care"]')
  await expect(bridge).toBeVisible()

  const contract = await bridge.evaluate((node) => {
    const brand = node.querySelector('.brand-story')
    const clients = node.querySelector('.client-types')
    const brandRect = brand.getBoundingClientRect()
    const clientsRect = clients.getBoundingClientRect()
    return {
      backgroundImage: getComputedStyle(node).backgroundImage,
      brandBackground: getComputedStyle(brand).backgroundColor,
      clientsBackground: getComputedStyle(clients).backgroundColor,
      boundaryGap: Math.abs(brandRect.bottom - clientsRect.top),
      brandColor: getComputedStyle(brand.querySelector('h2')).color,
      clientsColor: getComputedStyle(clients.querySelector('h2')).color,
    }
  })

  expect(contract.backgroundImage).toContain('linear-gradient')
  expect(contract.brandBackground).toBe('rgba(0, 0, 0, 0)')
  expect(contract.clientsBackground).toBe('rgba(0, 0, 0, 0)')
  expect(contract.boundaryGap).toBeLessThanOrEqual(1)
  expect(contract.brandColor).toBe('rgb(250, 249, 245)')
  expect(contract.clientsColor).toBe('rgb(250, 249, 245)')
  expect(issues, issues.join('\n')).toEqual([])
})

test('real Hero film, project evidence, and garden journal form one complete brand story', async ({ page }) => {
  const issues = watchPageHealth(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })

  const heroVideo = page.locator('.hero__video')
  await expect(heroVideo).toBeVisible()
  await expect.poll(() => heroVideo.evaluate((video) => video.readyState)).toBeGreaterThanOrEqual(2)
  const heroMedia = page.locator('.hero__media')
  const [videoBox, mediaBox] = await Promise.all([
    heroVideo.boundingBox(),
    heroMedia.boundingBox(),
  ])
  expect(videoBox).not.toBeNull()
  expect(mediaBox).not.toBeNull()
  expect(Math.abs(videoBox.width - mediaBox.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(videoBox.height - mediaBox.height)).toBeLessThanOrEqual(1)

  const firstCard = page.locator('.featured-projects .project-card').first()
  await firstCard.scrollIntoViewIfNeeded()
  await expect(firstCard.locator('.project-card__summary')).toBeVisible()
  await expect(firstCard.locator('.project-card__services li')).toHaveCount(2)
  expect(await firstCard.evaluate((card) => card.scrollWidth - card.clientWidth)).toBeLessThanOrEqual(1)

  const journal = page.getByRole('region', { name: '曜聖庭園誌' })
  await journal.scrollIntoViewIfNeeded()
  await expect(journal.getByRole('article')).toHaveCount(3)
  await expect(journal.getByRole('heading', { name: '庭園排水' })).toBeVisible()
  await expect(journal.getByRole('heading', { name: '樹木修剪' })).toBeVisible()
  await expect(journal.getByRole('heading', { name: '假山水景養護' })).toBeVisible()
  expect(issues, issues.join('\n')).toEqual([])
})

test('reduced motion keeps the Hero static and does not request the film', async ({ page }) => {
  const filmRequests = []
  page.on('request', (request) => {
    if (request.url().includes('nantun-water-garden')) filmRequests.push(request.url())
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })

  await expect(page.locator('.hero__image')).toBeVisible()
  await expect(page.locator('.hero__video')).toHaveCount(0)
  expect(filmRequests).toEqual([])
})

test('project detail exposes its four evidence fields without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/projects/nantun-rock-water-garden', { waitUntil: 'networkidle' })

  const facts = page.getByRole('region', { name: '案例工程摘要' })
  await facts.scrollIntoViewIfNeeded()
  for (const label of ['空間類型', '工程地區', '服務範圍', '養護方向']) {
    await expect(facts.getByText(label)).toBeVisible()
  }
  expect(await facts.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1)
})

test.describe('mobile performance budget', () => {
  test.describe.configure({ retries: 0 })

  test('390px selects the 480 AVIF Hero and reaches LCP within 2.5 seconds', async ({ page, context }) => {
    const client = await context.newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.setCacheDisabled', { cacheDisabled: true })
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 500_000,
      uploadThroughput: 500_000,
    })
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.addInitScript(() => {
      window.__yaoseiLcp = []
      new PerformanceObserver((list) => {
        window.__yaoseiLcp.push(...list.getEntries().map((entry) => ({
          className: entry.element?.getAttribute('class') ?? '',
          startTime: entry.startTime,
          tagName: entry.element?.tagName ?? '',
        })))
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(homeUrl, { waitUntil: 'networkidle' })
    await expect(page.locator('.hero__image')).toBeVisible()
    const heroVideo = page.locator('.hero__video')
    await expect(heroVideo).toBeVisible()
    await expect.poll(() => heroVideo.evaluate((video) => video.readyState)).toBeGreaterThanOrEqual(2)
    await page.waitForTimeout(500)

    const result = await page.locator('.hero__image').evaluate((image) => ({
      currentSrc: image.currentSrc,
      entries: window.__yaoseiLcp,
      lcp: Math.max(...window.__yaoseiLcp.map((entry) => entry.startTime)),
    }))
    expect(result.currentSrc).toMatch(/changhua-residence-03-480.*\.avif(?:\?|$)/)
    expect(result.lcp).toBeGreaterThan(0)
    expect(
      result.lcp,
      `LCP entries: ${result.entries.map(({ className, startTime, tagName }) => (
        `${startTime}ms ${tagName}.${className}`
      )).join(', ')}`,
    ).toBeLessThanOrEqual(2_500)
  })
})

test('reduced motion keeps all five scenes readable and activates each environment', async ({ page }) => {
  const issues = watchPageHealth(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })
  const home = page.locator('.editorial-home')
  await expect(page.locator('[data-scene]')).toHaveCount(5)

  for (const scene of scenes) {
    const section = page.locator(`[data-scene="${scene.id}"]`)
    const heading = section.getByRole('heading', { name: scene.heading })
    await heading.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'auto' }))
    await expect(heading).toBeVisible()
    await expect(home).toHaveAttribute('data-active-scene', scene.id)
    await expect(page.locator(`[data-environment="${scene.id}"]`)).toHaveClass(/is-active/)
    await expect(page.locator(`[data-environment="${scene.id}"]`)).toHaveCSS('opacity', '1')

    const rendered = await section.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      const visibleHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0))
      const point = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
        position: style.position,
        visibleHeight,
        centerBelongsToScene: point ? node.contains(point) : false,
      }
    })

    expect(rendered.display).not.toBe('none')
    expect(rendered.visibility).toBe('visible')
    expect(rendered.opacity).toBeGreaterThan(0)
    expect(rendered.position).not.toBe('sticky')
    expect(rendered.visibleHeight).toBeGreaterThan(0)
    expect(rendered.centerBelongsToScene).toBe(true)
  }

  await expect(page.getByRole('heading', { name: '直接與曜聖聯絡' })).toBeVisible()
  expect(issues, issues.join('\n')).toEqual([])
})
