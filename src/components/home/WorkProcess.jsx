import { processSteps } from '../../data/processSteps'
import Reveal from '../ui/Reveal'

export default function WorkProcess() {
  return (
    <section className="work-process section">
      <div className="container">
        <Reveal className="section-heading section-heading--split">
          <p className="section-label">OUR PROCESS</p>
          <h2>從理解現場，到風景落成</h2>
          <p>清楚的溝通與工序，讓每一個設計決定都回應實際需求。</p>
        </Reveal>

        <ol className="process-list">
          {processSteps.map(([number, title, description]) => (
            <Reveal as="li" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
