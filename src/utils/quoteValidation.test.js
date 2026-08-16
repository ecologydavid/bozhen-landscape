import { validateQuote } from './quoteValidation'

test('requires the five approved quote fields', () => {
  expect(validateQuote({})).toEqual(
    expect.objectContaining({
      name: '請填寫姓名',
      phone: '請填寫電話',
      region: '請填寫地區',
      serviceType: '請選擇需求類型',
      budget: '請選擇預算範圍',
    }),
  )
})

test('validates phone and optional email formats', () => {
  expect(
    validateQuote({
      name: '王先生',
      phone: 'abc',
      region: '台中',
      serviceType: '庭園設計',
      budget: '50–100 萬',
      email: 'bad',
    }),
  ).toEqual(
    expect.objectContaining({
      phone: '請填寫有效電話',
      email: '請填寫有效 Email',
    }),
  )
})
