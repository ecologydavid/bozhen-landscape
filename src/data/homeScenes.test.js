import { homeScenes } from './homeScenes'

test('defines the approved one-screen-one-scene sequence', () => {
  expect(homeScenes.map((scene) => scene.id)).toEqual([
    'plant',
    'stone',
    'water',
    'craft',
    'care',
  ])
  expect(new Set(homeScenes.map((scene) => scene.sectionId)).size).toBe(5)
  homeScenes.forEach((scene) => {
    expect(scene).toEqual(expect.objectContaining({
      id: expect.any(String),
      sectionId: expect.any(String),
      label: expect.any(String),
      english: expect.any(String),
      tone: expect.any(String),
    }))
  })
})
