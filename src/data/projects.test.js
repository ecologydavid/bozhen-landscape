import { projectCategories, projects } from './projects'

test('project slugs are unique and required content is present', () => {
  expect(projectCategories).toEqual([
    '全部',
    '住宅庭園',
    '商業綠化',
    '假山水景',
    '養護工程',
  ])
  const slugs = projects.map((project) => project.slug)
  expect(new Set(slugs).size).toBe(slugs.length)
  expect(projects).toHaveLength(6)
  expect(projects.map(({ slug, focalPoint }) => ({ slug, focalPoint }))).toEqual([
    { slug: 'changhua-private-residence', focalPoint: '50% 52%' },
    { slug: 'tianzhong-private-courtyard', focalPoint: '48% 54%' },
    { slug: 'nantun-rock-water-garden', focalPoint: '50% 48%' },
    { slug: 'taoyuan-school-green-wall', focalPoint: '50% 46%' },
    { slug: 'taichung-garden-maintenance', focalPoint: '54% 50%' },
    { slug: 'puli-winery-landscape', focalPoint: '50% 55%' },
  ])

  for (const project of projects) {
    expect(project).toEqual(
      expect.objectContaining({
        slug: expect.any(String),
        title: expect.any(String),
        category: expect.any(String),
        location: expect.any(String),
        heroImage: expect.any(String),
        gallery: expect.any(Array),
        clientNeed: expect.any(String),
        designApproach: expect.any(String),
        materials: expect.any(Array),
        services: expect.any(Array),
        alt: expect.any(String),
        featured: expect.any(Boolean),
      }),
    )
    expect(project.heroImage).toMatch(/\.webp$/)
    expect(project.focalPoint).toMatch(/^\d+% \d+%$/)
    const [horizontal, vertical] = project.focalPoint
      .split(' ')
      .map((coordinate) => Number.parseInt(coordinate, 10))
    expect(horizontal).toBeGreaterThanOrEqual(0)
    expect(horizontal).toBeLessThanOrEqual(100)
    expect(vertical).toBeGreaterThanOrEqual(0)
    expect(vertical).toBeLessThanOrEqual(100)
    expect(project.gallery.length).toBeGreaterThanOrEqual(2)
    expect(project.gallery.every((image) => image.endsWith('.webp'))).toBe(true)
    expect(project.services.length).toBeGreaterThan(0)
  }
})

test('exactly three projects are featured', () => {
  expect(projects.filter((project) => project.featured)).toHaveLength(3)
})
