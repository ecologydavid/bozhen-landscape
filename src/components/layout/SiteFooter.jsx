import { Link } from 'react-router-dom'
import { services } from '../../data/services'

export default function SiteFooter({ onUnavailable = () => {} }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <strong>柏鎮園藝假山水</strong>
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
          <Link to="/#quote">取得報價</Link>
        </div>

        <div className="site-footer__contact">
          <span className="site-footer__label">聯絡柏鎮</span>
          <button
            type="button"
            onClick={() =>
              onUnavailable('LINE 聯絡功能將於正式上線時開放')
            }
          >
            LINE
          </button>
          <button
            type="button"
            onClick={() =>
              onUnavailable('Email 聯絡功能將於正式上線時開放')
            }
          >
            Email
          </button>
        </div>
      </div>
      <div className="site-footer__bottom">
        <small>© {new Date().getFullYear()} 柏鎮園藝假山水</small>
        <small>網站目前為形象示意版本</small>
      </div>
    </footer>
  )
}
