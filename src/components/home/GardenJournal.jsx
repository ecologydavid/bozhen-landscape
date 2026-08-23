import BrandImage from '../ui/BrandImage'
import Reveal from '../ui/Reveal'

export default function GardenJournal({ notes }) {
  return (
    <section
      className="garden-journal section"
      aria-labelledby="garden-journal-title"
    >
      <div className="container">
        <Reveal className="garden-journal__heading">
          <div>
            <p className="section-label">YAO SEI FIELD NOTES</p>
            <h2 id="garden-journal-title">曜聖庭園誌</h2>
          </div>
          <p>把現場經驗，整理成庭園長久好看的方法。</p>
        </Reveal>

        <div className="garden-journal__grid">
          {notes.map((note, index) => (
            <Reveal key={note.title} className={index === 0 ? 'garden-note garden-note--lead' : 'garden-note'}>
              <article>
                <div className="garden-note__media">
                  <BrandImage
                    src={note.image}
                    alt={note.alt}
                    loading="lazy"
                    decoding="async"
                    sizes={index === 0 ? '(max-width: 768px) calc(100vw - 28px), 58vw' : '(max-width: 768px) calc(100vw - 28px), 30vw'}
                  />
                </div>
                <div className="garden-note__content">
                  <div className="garden-note__meta">
                    <span>{note.number}</span>
                    <small>{note.english}</small>
                  </div>
                  <h3>{note.title}</h3>
                  <p>{note.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
