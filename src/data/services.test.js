import { services } from './services'

test('services provide real imagery and a consistent plant icon', () => {
  expect(services).toHaveLength(4)
  services.forEach((service) => {
    expect(service).toEqual(expect.objectContaining({
      id: expect.any(String),
      title: expect.any(String),
      summary: expect.any(String),
      image: expect.objectContaining({
        src: expect.stringMatching(/\.webp$/),
        avifSrc: expect.stringMatching(/\.avif$/),
      }),
      imageAlt: expect.any(String),
      icon: expect.stringMatching(/^(sprout|leaf|water|care)$/),
    }))
  })
})
