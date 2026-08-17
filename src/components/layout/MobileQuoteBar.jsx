export default function MobileQuoteBar({ contact }) {
  return (
    <div className="mobile-contact-bar" aria-label="快速聯絡">
      <a href={contact.phoneHref}>電話聯絡</a>
      <a href={contact.lineHref} target="_blank" rel="noreferrer">LINE 聯絡</a>
    </div>
  )
}
