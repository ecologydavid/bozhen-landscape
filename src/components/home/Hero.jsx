import BrandImage from '../ui/BrandImage'

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
          <span className="hero__sun" aria-hidden="true" />
        </div>

        <div className="hero__contact">
          <p className="hero__description">{hero.description}</p>
          <div className="hero__actions">
            <a
              className="button button--accent"
              href={contact.lineHref}
              target="_blank"
              rel="noreferrer"
            >
              LINE 聯絡
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </a>
            <a className="hero__phone" href={contact.phoneHref}>
              撥打 {contact.mobile}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
