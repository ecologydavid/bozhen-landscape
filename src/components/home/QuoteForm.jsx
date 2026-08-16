import { useRef, useState } from 'react'
import { siteContent } from '../../data/siteContent'
import { validateQuote } from '../../utils/quoteValidation'

const initialValues = {
  name: '',
  phone: '',
  region: '',
  serviceType: '',
  budget: '',
  email: '',
  notes: '',
}

const fieldOrder = [
  'name',
  'phone',
  'region',
  'serviceType',
  'budget',
  'email',
]

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <span className="field-error" id={id} role="alert">
      {message}
    </span>
  )
}

export default function QuoteForm({ onUnavailable }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const formRef = useRef(null)

  const updateField = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }))
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = validateQuote(values)
    setErrors(nextErrors)

    const firstInvalidField = fieldOrder.find((field) => nextErrors[field])
    if (firstInvalidField) {
      formRef.current?.elements.namedItem(firstInvalidField)?.focus()
      return
    }

    onUnavailable('目前為網站示意版本，正式上線後開放送出報價')
  }

  const inputProps = (name) => ({
    name,
    value: values[name],
    onChange: updateField,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  })

  return (
    <section className="quote-section section" id="quote">
      <div className="container quote-section__grid">
        <div className="quote-section__intro">
          <p className="section-label">START A PROJECT</p>
          <h2>把你想像的風景，交給我們一起完成</h2>
          <p>
            留下空間位置與初步需求，我們將在正式服務開放後安排專人與你聯繫。
          </p>
          <div className="quote-section__note">
            <span aria-hidden="true">01</span>
            <p>此版本為網站功能示意，不會傳送或儲存你填寫的資料。</p>
          </div>
        </div>

        <form
          ref={formRef}
          className="quote-form"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="form-field">
            <label htmlFor="quote-name">姓名</label>
            <input id="quote-name" type="text" autoComplete="name" {...inputProps('name')} />
            <FieldError id="name-error" message={errors.name} />
          </div>

          <div className="form-field">
            <label htmlFor="quote-phone">電話</label>
            <input id="quote-phone" type="tel" autoComplete="tel" {...inputProps('phone')} />
            <FieldError id="phone-error" message={errors.phone} />
          </div>

          <div className="form-field">
            <label htmlFor="quote-region">地區</label>
            <input id="quote-region" type="text" {...inputProps('region')} />
            <FieldError id="region-error" message={errors.region} />
          </div>

          <div className="form-field">
            <label htmlFor="quote-service">需求類型</label>
            <select id="quote-service" {...inputProps('serviceType')}>
              <option value="">請選擇</option>
              {siteContent.serviceTypes.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
            <FieldError id="serviceType-error" message={errors.serviceType} />
          </div>

          <div className="form-field">
            <label htmlFor="quote-budget">預算範圍</label>
            <select id="quote-budget" {...inputProps('budget')}>
              <option value="">請選擇</option>
              {siteContent.budgetRanges.map((budget) => (
                <option key={budget} value={budget}>
                  {budget}
                </option>
              ))}
            </select>
            <FieldError id="budget-error" message={errors.budget} />
          </div>

          <div className="form-field">
            <label htmlFor="quote-email">Email（選填）</label>
            <input id="quote-email" type="email" autoComplete="email" {...inputProps('email')} />
            <FieldError id="email-error" message={errors.email} />
          </div>

          <div className="form-field form-field--wide">
            <label htmlFor="quote-notes">需求說明（選填）</label>
            <textarea id="quote-notes" rows="4" {...inputProps('notes')} />
          </div>

          <button className="button button--gold form-submit" type="submit">
            送出報價需求
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>
    </section>
  )
}
