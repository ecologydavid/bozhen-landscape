import { Link } from 'react-router-dom'
import { services } from '../../data/services'

export default function SiteFooter({ brand, contact }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <strong>{brand.name}</strong>
          <p>讓自然成為生活裡，長久而安定的風景。</p>
        </div>

        <div className="site-footer__services" aria-label="服務項目">
          <span className="site-footer__label">服務項目</span>
          {services.map((service) => (
            <span key={service.id}>{service.title}</span>
          ))}
        </div>

        <div className="site-footer__links">
          <span className="site-footer__label">網站導覽</span>
          <Link to="/">首頁</Link>
          <Link to="/projects">案例作品</Link>
          <Link to="/#contact">聯絡我們</Link>
        </div>

        <div className="site-footer__contact">
          <span className="site-footer__label">直接聯絡</span>
          <a href={contact.phoneHref}>{contact.mobile}</a>
          <a href={contact.lineHref} target="_blank" rel="noreferrer">LINE</a>
          <a href={contact.emailHref}>Email</a>
        </div>
      </div>
      <div className="site-footer__bottom">
        <small>© {new Date().getFullYear()} {brand.name}</small>
        <small>統一編號 {contact.taxId}</small>
      </div>
    </footer>
  )
}
