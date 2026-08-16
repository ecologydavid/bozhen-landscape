import BrandImage from '../ui/BrandImage'
import Reveal from '../ui/Reveal'

const storyImage =
  'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1500&q=86'

export default function BrandStory() {
  return (
    <section className="brand-story section" id="about">
      <div className="container brand-story__grid">
        <Reveal className="brand-story__media">
          <BrandImage
            src={storyImage}
            alt="庭園職人細心整理植栽與石景"
            loading="lazy"
          />
          <span className="brand-story__seal" aria-hidden="true">
            <b>柏</b>
            <small>景觀工藝</small>
          </span>
        </Reveal>

        <Reveal className="brand-story__content">
          <p className="section-label">ABOUT BOZHEN</p>
          <h2>
            讓庭園隨時間，<br />長成生活的一部分
          </h2>
          <p>
            每一座庭園，都從理解現場開始。我們觀察日照、風向、排水與使用動線，讓景觀不只是完成當下，更能自然地陪伴生活。
          </p>
          <p>
            從石材的比例、流水的聲音到植栽的季節變化，柏鎮以細緻工法收整每個細節，留下耐看，也經得起時間的風景。
          </p>
        </Reveal>
      </div>
    </section>
  )
}
