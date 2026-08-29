import logoSrc from '../assets/brand/yaosei-logo-gold.jpg'
import companyCardSrc from '../assets/brand/yaosei-company-card-gold.jpg'
import heroVideoSrc from '../assets/hero/nantun-water-garden.mp4'
import { media } from './projectMedia'

export const siteContent = {
  brand: {
    name: '曜聖景觀有限公司',
    shortName: '曜聖景觀',
    contactPerson: '葉柏鎮',
    englishName: 'YAO SHENG LIMITED COMPANY',
    logoSrc,
    companyCardSrc,
  },
  contact: {
    mobile: '0921-047-049',
    office: '04-8750911',
    fax: '04-8758069',
    taxId: '00111874',
    email: 'a74964163285@gmail.com',
    address: '彰化縣田中鎮大社路一段702巷109號2F',
    lineId: '0921047049',
    phoneHref: 'tel:+886921047049',
    officeHref: 'tel:+88648750911',
    emailHref: 'mailto:a74964163285@gmail.com',
    lineHref: 'https://line.me/ti/p/~0921047049',
  },
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=61593424035642',
    instagram: 'https://www.instagram.com/yaoshenglandscape/',
  },
  hero: {
    eyebrow: 'YAO SHENG LANDSCAPE',
    title: '把自然，安放進日常',
    description: '庭園設計・植栽綠化・假山水景・後續養護',
    image: media('changhua-residence-03.webp'),
    alt: '彰化私人住宅庭園實景',
    videoSrc: heroVideoSrc,
  },
  clients: ['私人住宅', '別墅透天', '社區公設', '企業商空'],
}
