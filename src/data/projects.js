const image = (id, width = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=84`

export const projectCategories = [
  '全部',
  '住宅庭園',
  '植栽綠化',
  '假山水景',
  '商業／社區',
]

export const projects = [
  [
    'moss-courtyard',
    '苔庭・靜水之間',
    '住宅庭園',
    '台中',
    'photo-1585320806297-9794b3e4eeae',
    true,
  ],
  [
    'stone-waterfall',
    '疊石・山澗水景',
    '假山水景',
    '彰化',
    'photo-1584464491033-06628f3a6b7b',
    true,
  ],
  [
    'green-balcony',
    '城市中的綠意陽台',
    '植栽綠化',
    '台中',
    'photo-1416879595882-3373a0480b5b',
    true,
  ],
  [
    'villa-garden',
    '別墅四季庭園',
    '住宅庭園',
    '南投',
    'photo-1558521958-0a228e77e984',
    false,
  ],
  [
    'community-landscape',
    '社區迎賓景觀',
    '商業／社區',
    '台中',
    'photo-1580137189272-c9379f8864fd',
    false,
  ],
  [
    'pond-renewal',
    '老水池再生計畫',
    '假山水景',
    '苗栗',
    'photo-1586348943529-beaae6c28db9',
    false,
  ],
].map(([slug, title, category, location, photoId, featured], index) => ({
  slug,
  title,
  category,
  location,
  featured,
  summary:
    '以自然比例重新整理空間層次，讓植栽、石景與人的生活彼此連結。',
  heroImage: image(photoId),
  gallery: [
    image(photoId, 1200),
    image('photo-1416879595882-3373a0480b5b', 1200),
    image('photo-1585320806297-9794b3e4eeae', 1200),
  ],
  clientNeed:
    '希望改善原有空間動線，同時保留自然、安定且容易照護的景觀感受。',
  designApproach:
    '依現場尺度與採光配置植栽、自然石及水景，透過留白建立沉靜層次。',
  materials: [
    '自然石',
    '耐候植栽',
    index % 2 === 0 ? '景觀照明' : '循環水系統',
  ],
}))
