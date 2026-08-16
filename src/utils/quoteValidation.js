export function validateQuote(values) {
  const errors = {}

  if (!values.name?.trim()) errors.name = '請填寫姓名'
  if (!values.phone?.trim()) errors.phone = '請填寫電話'
  else if (!/^[0-9+()\-\s]{8,20}$/.test(values.phone)) {
    errors.phone = '請填寫有效電話'
  }
  if (!values.region?.trim()) errors.region = '請填寫地區'
  if (!values.serviceType) errors.serviceType = '請選擇需求類型'
  if (!values.budget) errors.budget = '請選擇預算範圍'
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = '請填寫有效 Email'
  }

  return errors
}
