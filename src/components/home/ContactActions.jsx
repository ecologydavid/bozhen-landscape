import BrandImage from '../ui/BrandImage'
import LeafIcon from '../ui/LeafIcon'
import Reveal from '../ui/Reveal'
import SocialIcon from '../ui/SocialIcon'
import { trackEvent } from '../../lib/analytics'

export default function ContactActions({ brand, contact, social = {} }) {
  return (
    <section
      className="contact-panel section scene-section"
      id="contact"
      data-scene="care"
      aria-labelledby="contact-panel-title"
    >
      <div className="container contact-panel__grid">
        <Reveal className="contact-panel__brand">
          <BrandImage
            src={brand.companyCardSrc}
            alt={`${brand.name}官方識別`}
            loading="lazy"
          />
        </Reveal>

        <Reveal className="contact-panel__content">
          <p className="section-label">CONTACT YAO SHENG</p>
          <h2 id="contact-panel-title">直接與曜聖聯絡</h2>
          <p className="contact-panel__intro">
            告訴葉先生你的空間位置與需求，我們會與你確認現場條件、服務內容及後續安排。
          </p>

          <div className="contact-panel__actions">
            <a
              href={contact.lineHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent('contact_click', { method: 'line', location: 'contact_section' })}
            >
              <span>LINE 聯絡</span>
              <small>ID {contact.lineId}</small>
              <LeafIcon name="sprout" />
            </a>
            <a
              href={contact.phoneHref}
              onClick={() => trackEvent('contact_click', { method: 'phone', location: 'contact_section' })}
            >
              <span>撥打 {contact.mobile}</span>
              <small>行動電話</small>
              <LeafIcon name="sprout" />
            </a>
            <a
              href={contact.emailHref}
              aria-label={`Email ${contact.email}`}
              onClick={() => trackEvent('contact_click', { method: 'email', location: 'contact_section' })}
            >
              <span>Email 聯絡</span>
              <small>{contact.email}</small>
              <LeafIcon name="sprout" />
            </a>
          </div>

          <div className="contact-panel__socials" aria-label="社群連結">
            <a
              href={social.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook 曜聖景觀"
              onClick={() => trackEvent('social_click', { network: 'facebook', location: 'contact_section' })}
            >
              <SocialIcon name="facebook" />
              Facebook <span>↗</span>
            </a>
            <a
              href={social.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram 曜聖景觀"
              onClick={() => trackEvent('social_click', { network: 'instagram', location: 'contact_section' })}
            >
              <SocialIcon name="instagram" />
              Instagram <span>↗</span>
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
