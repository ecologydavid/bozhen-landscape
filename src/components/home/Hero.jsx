import BrandImage from '../ui/BrandImage'
import LeafActions from '../ui/LeafActions'

export default function Hero({ hero, contact }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
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
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="hero__shade" aria-hidden="true" />
          <span className="hero__field-note">彰化・私人住宅庭園</span>
        </div>

        <div className="hero__contact">
          <p className="hero__description">{hero.description}</p>
          <div className="hero__actions">
            <LeafActions
              projectsHref="/projects"
              lineHref={contact.lineHref}
            />
            <a className="hero__phone" href={contact.phoneHref}>
              撥打 {contact.mobile}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
