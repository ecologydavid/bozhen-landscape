import { siteContent } from './siteContent'

test('stores the official Yao Sei brand and direct contact details', () => {
  expect(siteContent.brand).toMatchObject({
    name: '曜聖景觀有限公司',
    shortName: '曜聖景觀',
    contactPerson: '葉柏鎮',
    englishName: 'YAO SEI LIMITED COMPANY',
  })
  expect(siteContent.contact).toMatchObject({
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
  })
  expect(siteContent.hero).toMatchObject({
    title: '把自然，安放進日常',
    description: '庭園設計・植栽綠化・假山水景・後續養護',
    alt: '彰化私人住宅庭園實景',
  })
  expect(siteContent.hero.image).toMatch(/\.webp$/)
})
