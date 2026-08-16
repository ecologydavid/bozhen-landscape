import { siteContent } from '../../data/siteContent'
import { Link } from 'react-router-dom'
import BrandImage from '../ui/BrandImage'

export default function Hero() {
  const { hero } = siteContent

  return (
    <section className="hero" aria-labelledby="hero-title">
      <BrandImage
        className="hero__image"
        src={hero.image}
        alt="自然石、水景與綠意交織的庭園"
        fetchPriority="high"
      />
      <div className="hero__shade" aria-hidden="true" />
      <div className="hero__content">
        <p className="hero__eyebrow">{hero.eyebrow}</p>
        <h1 id="hero-title">{hero.title}</h1>
        <p className="hero__description">{hero.description}</p>
        <Link className="button button--outline" to="/#quote">
          取得專屬報價
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
      <Link
        className="hero__scroll"
        to="/#services"
        aria-label="瀏覽服務項目"
      >
        <span>SCROLL</span>
        <i aria-hidden="true" />
      </Link>
    </section>
  )
}
