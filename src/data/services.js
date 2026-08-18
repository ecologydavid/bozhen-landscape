import { media } from './projectMedia'

export const services = [
  {
    id: 'garden',
    number: '01',
    title: '庭園設計',
    summary: '從日照、風向與生活動線出發，規劃自然融入建築的庭園。',
    image: media('changhua-residence-02.webp'),
    imageAlt: '住宅庭園與建築動線整合實景',
    icon: 'sprout',
  },
  {
    id: 'planting',
    number: '02',
    title: '植栽綠化',
    summary: '依環境條件配置植栽層次，兼顧四季景觀與後續照護。',
    image: media('taoyuan-greenwall-01.webp'),
    imageAlt: '植生牆與多層次綠化實景',
    icon: 'leaf',
  },
  {
    id: 'waterscape',
    number: '03',
    title: '假山水景',
    summary: '運用自然石、流水與細緻工法，建立具有生命感的水景。',
    image: media('nantun-residence-01.webp'),
    imageAlt: '自然石與流水構成的假山水景',
    icon: 'water',
  },
  {
    id: 'care',
    number: '04',
    title: '後續養護',
    summary: '提供修剪、植栽照料與水景維護，讓景觀長期保持平衡。',
    image: media('taichung-maintenance-04.webp'),
    imageAlt: '日式庭園修剪與石景養護實景',
    icon: 'care',
  },
]
