import { Link } from 'react-router-dom'
import LeafContactLinks from '../ui/LeafContactLinks'
import LeafIcon from '../ui/LeafIcon'
import HeroMedia from './HeroMedia'
import SocialIcon from '../ui/SocialIcon'
import { trackEvent } from '../../lib/analytics'

export default function Hero({ hero, contact, social = {} }) {
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
          <nav className="hero__socials" aria-label="首頁社群連結">
            <a
              href={social.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook 曜聖景觀"
              onClick={() => trackEvent('social_click', { network: 'facebook', location: 'hero' })}
            >
              <SocialIcon name="facebook" />
              <span>Facebook</span>
            </a>
            <a
              href={social.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram 曜聖景觀"
              onClick={() => trackEvent('social_click', { network: 'instagram', location: 'hero' })}
            >
              <SocialIcon name="instagram" />
              <span>Instagram</span>
            </a>
          </nav>
        </div>

        <HeroMedia image={hero.image} alt={hero.alt} videoSrc={hero.videoSrc} />

        <div className="hero__contact">
          <p className="hero__description">{hero.description}</p>
          <div className="hero__actions">
            <Link
              className="hero__projects-link"
              to="/projects"
              onClick={() => trackEvent('view_projects_click', { location: 'hero' })}
            >
              <LeafIcon name="sprout" />
              <span>瀏覽庭園作品</span>
            </Link>
            <LeafContactLinks
              contact={contact}
              className="leaf-contact-links--stone-sprout"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
