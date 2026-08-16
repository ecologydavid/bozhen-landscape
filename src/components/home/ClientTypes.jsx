import { siteContent } from '../../data/siteContent'
import Reveal from '../ui/Reveal'

export default function ClientTypes() {
  return (
    <section className="client-types section">
      <div className="container">
        <Reveal className="client-types__heading">
          <p className="section-label">SPACES WE SERVE</p>
          <h2>從私人庭園，到共享空間</h2>
        </Reveal>
        <Reveal as="ul" className="client-types__list">
          {siteContent.clients.map((client) => (
            <li key={client}>{client}</li>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
