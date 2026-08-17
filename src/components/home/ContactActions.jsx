import BrandImage from '../ui/BrandImage'
import Reveal from '../ui/Reveal'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
)

export default function ContactActions({ brand, contact }) {
  return (
    <section className="contact-panel section" id="contact">
      <div className="container contact-panel__grid">
        <Reveal className="contact-panel__brand">
          <BrandImage
            src={brand.companyCardSrc}
            alt={`${brand.name}官方識別`}
            loading="lazy"
          />
        </Reveal>

        <Reveal className="contact-panel__content">
          <p className="section-label">CONTACT YAO SEI</p>
          <h2>直接與曜聖聯絡</h2>
          <p className="contact-panel__intro">
            告訴葉先生你的空間位置與需求，我們會與你確認現場條件、服務內容及後續安排。
          </p>

          <div className="contact-panel__actions">
            <a href={contact.lineHref} target="_blank" rel="noreferrer">
              <span>LINE 聯絡</span>
              <small>ID {contact.lineId}</small>
              <ArrowIcon />
            </a>
            <a href={contact.phoneHref}>
              <span>撥打 {contact.mobile}</span>
              <small>行動電話</small>
              <ArrowIcon />
            </a>
            <a href={contact.emailHref}>
              <span>Email 聯絡</span>
              <small>{contact.email}</small>
              <ArrowIcon />
            </a>
          </div>

          <dl className="contact-panel__details">
            <div>
              <dt>公司電話</dt>
              <dd><a href={contact.officeHref}>{contact.office}</a></dd>
            </div>
            <div>
              <dt>傳真</dt>
              <dd>{contact.fax}</dd>
            </div>
            <div>
              <dt>統一編號</dt>
              <dd>{contact.taxId}</dd>
            </div>
            <div className="contact-panel__address">
              <dt>公司地址</dt>
              <dd>{contact.address}</dd>
            </div>
          </dl>
        </Reveal>
      </div>
    </section>
  )
}
