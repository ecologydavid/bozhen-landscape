import { Link } from 'react-router-dom'
import LeafContactLinks from '../ui/LeafContactLinks'
import LeafIcon from '../ui/LeafIcon'
import HeroMedia from './HeroMedia'

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

        <HeroMedia image={hero.image} alt={hero.alt} videoSrc={hero.videoSrc} />

        <div className="hero__contact">
          <p className="hero__description">{hero.description}</p>
          <div className="hero__actions">
            <Link className="hero__projects-link" to="/projects">
              <LeafIcon name="sprout" />
              <span>瀏覽庭園作品</span>
            </Link>
            <LeafContactLinks contact={contact} />
          </div>
        </div>
      </div>
    </section>
  )
}
