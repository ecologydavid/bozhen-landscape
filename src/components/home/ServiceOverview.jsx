import { Link } from 'react-router-dom'
import { services } from '../../data/services'
import BrandImage from '../ui/BrandImage'
import LeafIcon from '../ui/LeafIcon'
import Reveal from '../ui/Reveal'

export default function ServiceOverview() {
  return (
    <section className="services section" id="services">
      <div className="container">
        <Reveal className="section-heading section-heading--split">
          <p className="section-label">OUR SERVICES</p>
          <h2>以專業工法，完成自然的尺度</h2>
          <p>
            從空間規劃、植栽配置到水景施工，依現場條件整合每一處細節。
          </p>
        </Reveal>

        <div className="service-list">
          {services.map((service) => (
            <Reveal as="article" className="service-card" key={service.id}>
              <div className="service-card__media">
                <BrandImage
                  src={service.image}
                  alt={service.imageAlt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="service-card__content">
                <span className="service-card__tag">
                  <LeafIcon />
                  {service.tag}
                </span>
                <h3>{service.title}</h3>
                <p>{service.summary}</p>
                <Link to="/projects" className="service-card__link">
                  {service.linkLabel}
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
