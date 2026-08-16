import { projects } from './projects'

test('project slugs are unique and required content is present', () => {
  const slugs = projects.map((project) => project.slug)
  expect(new Set(slugs).size).toBe(slugs.length)
  expect(projects).toHaveLength(6)

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
        featured: expect.any(Boolean),
      }),
    )
    expect(project.gallery.length).toBeGreaterThanOrEqual(3)
  }
})

test('exactly three projects are featured', () => {
  expect(projects.filter((project) => project.featured)).toHaveLength(3)
})
