import { Link } from 'react-router-dom'
import BrandImage from '../ui/BrandImage'
import LeafContactLinks from '../ui/LeafContactLinks'
import LeafIcon from '../ui/LeafIcon'

export default function Hero({ hero, contact }) {
  return (
    <section
      className="hero scene-section"
      id="home"
      data-scene="plant"
      aria-labelledby="hero-title"
    >
      <div className="container hero__layout">
        <div className="hero__copy">
          <p className="hero__eyebrow">GREEN YOUR LIFE</p>
          <h1 id="hero-title">{hero.title}</h1>
        </div>

        <div className="hero__media">
          <BrandImage
            className="hero__image"
            src={hero.image}
            alt={hero.alt}
            sizes="(max-width: 768px) calc(100vw - 52px), (max-width: 1280px) 54vw, 720px"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="hero__shade" aria-hidden="true" />
          <span className="hero__sun" aria-hidden="true" />
        </div>

        <div className="hero__contact">
          <p className="hero__description">{hero.description}</p>
          <div className="hero__actions">
            <Link className="hero__projects-link" to="/projects">
              <LeafIcon name="arrowLeaf" />
              <span>瀏覽庭園作品</span>
            </Link>
            <LeafContactLinks contact={contact} />
          </div>
        </div>
      </div>
    </section>
  )
}
