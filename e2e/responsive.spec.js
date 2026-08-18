import { expect, test } from '@playwright/test'

const pagesBasePath = '/bozhen-landscape/'
const homeUrl = './#/'

const viewports = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
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

async function expectVisibleContactPairToFit(page) {
  const pair = page.locator('.leaf-contact-links:visible')
  await expect(pair).toHaveCount(1)
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

for (const route of productionRoutes) {
  test(`${route.url} loads from the production Pages mount without runtime or asset failures`, async ({ page }) => {
    await expectHealthyProductionPage(page, route)
  })
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
