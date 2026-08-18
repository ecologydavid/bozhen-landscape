import { homeScenes } from './homeScenes'

test('defines the approved one-screen-one-scene sequence', () => {
  expect(homeScenes).toEqual([
    { id: 'plant', sectionId: 'home', label: '植物', english: 'PLANT', tone: 'paper' },
    { id: 'stone', sectionId: 'works', label: '石組', english: 'STONE', tone: 'stone' },
    { id: 'water', sectionId: 'services', label: '水景', english: 'WATER', tone: 'moss' },
    { id: 'craft', sectionId: 'process', label: '造景', english: 'CRAFT', tone: 'ink' },
    { id: 'care', sectionId: 'contact', label: '養景', english: 'CARE', tone: 'amber' },
  ])
  expect(new Set(homeScenes.map((scene) => scene.sectionId)).size).toBe(5)
})
