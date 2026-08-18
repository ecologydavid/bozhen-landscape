import { expect, test } from '@playwright/test'

const viewports = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'wide-1920', width: 1920, height: 1080 },
]

function watchRuntimeErrors(page) {
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  return runtimeErrors
}

for (const viewport of viewports) {
  test(`${viewport.name} has no horizontal overflow`, async ({ page }) => {
    const runtimeErrors = watchRuntimeErrors(page)
    await page.setViewportSize(viewport)
    await page.goto('/#/')
    await expect(page.getByRole('heading', { name: '把自然，安放進日常' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    const contactLabels = page.locator('.leaf-contact-links__item span')
    expect(await contactLabels.count()).toBeGreaterThan(0)
    for (let index = 0; index < await contactLabels.count(); index += 1) {
      await expect(contactLabels.nth(index)).toHaveCSS('white-space', 'nowrap')
    }

    const heroGeometry = await page.evaluate(() => {
      const media = document.querySelector('.hero__media')?.getBoundingClientRect()
      const image = document.querySelector('.hero__image')?.getBoundingClientRect()
      const copy = document.querySelector('.hero__copy')?.getBoundingClientRect()
      if (!media || !image || !copy) return null
      return {
        media: { top: media.top, right: media.right, bottom: media.bottom, left: media.left },
        image: { top: image.top, right: image.right, bottom: image.bottom, left: image.left },
        copy: { top: copy.top, bottom: copy.bottom },
      }
    })
    expect(heroGeometry).not.toBeNull()
    expect(Math.abs(heroGeometry.image.left - heroGeometry.media.left)).toBeLessThanOrEqual(1)
    expect(Math.abs(heroGeometry.image.right - heroGeometry.media.right)).toBeLessThanOrEqual(1)
    expect(Math.abs(heroGeometry.image.top - heroGeometry.media.top)).toBeLessThanOrEqual(1)
    expect(Math.abs(heroGeometry.image.bottom - heroGeometry.media.bottom)).toBeLessThanOrEqual(1)
    if (viewport.width <= 768) {
      expect(heroGeometry.copy.top).toBeGreaterThanOrEqual(heroGeometry.media.top - 1)
      expect(heroGeometry.copy.bottom).toBeLessThanOrEqual(heroGeometry.media.bottom + 1)
    }

    expect(runtimeErrors).toEqual([])
  })
}

test('mobile menu is full, refined, and keyboard-closeable', async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/')
  const toggle = page.getByRole('button', { name: '開啟選單' })
  await toggle.click()
  const navigation = page.getByRole('navigation', { name: '主要導覽' })
  await expect(navigation).toHaveClass(/is-open/)
  await expect(navigation.getByRole('link', { name: '作品案例' })).toBeFocused()
  await expect(navigation.getByRole('link', { name: 'LINE 聯絡' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: '撥打 0921-047-049' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(toggle).toBeFocused()
  await expect(page.locator('body')).not.toHaveClass(/nav-open/)
  expect(runtimeErrors).toEqual([])
})

test('reduced motion keeps all five scenes readable', async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/')
  await expect(page.locator('[data-scene]')).toHaveCount(5)
  await expect(page.getByRole('heading', { name: '直接與曜聖聯絡' })).toBeVisible()
  expect(runtimeErrors).toEqual([])
})
