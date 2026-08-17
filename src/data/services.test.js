import { services } from './services'

test('services expose meaningful visual metadata without decorative numbering', () => {
  expect(services).toHaveLength(4)
  services.forEach((service) => {
    expect(service).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: expect.any(String),
        summary: expect.any(String),
        tag: expect.any(String),
        image: expect.stringMatching(/\.webp$/),
        imageAlt: expect.any(String),
        linkLabel: expect.any(String),
      }),
    )
    expect(service).not.toHaveProperty('number')
  })
})
