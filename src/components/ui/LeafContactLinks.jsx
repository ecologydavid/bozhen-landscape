import LeafIcon from './LeafIcon'
import { trackEvent } from '../../lib/analytics'

export default function LeafContactLinks({ contact, className = '' }) {
  const location = className.includes('mobile') ? 'mobile_sticky' : 'hero'

  return (
    <div className={`leaf-contact-links ${className}`.trim()}>
      <a
        className="leaf-contact-links__item leaf-contact-links__line"
        href={contact.lineHref}
        target="_blank"
        rel="noreferrer"
        aria-label="LINE 聯絡"
        onClick={() => trackEvent('contact_click', { method: 'line', location })}
      >
        <LeafIcon name="sprout" />
        <span>LINE 聯絡</span>
        <span className="leaf-contact-links__arrow" aria-hidden="true">↗</span>
      </a>
      <a
        className="leaf-contact-links__item leaf-contact-links__phone"
        href={contact.phoneHref}
        aria-label={`撥打 ${contact.mobile}`}
        onClick={() => trackEvent('contact_click', { method: 'phone', location })}
      >
        <LeafIcon name="sprout" />
        <span>撥打電話</span>
        <span className="leaf-contact-links__arrow" aria-hidden="true">↗</span>
      </a>
    </div>
  )
}
