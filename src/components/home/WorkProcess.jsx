import { processSteps } from '../../data/processSteps'
import LeafIcon from '../ui/LeafIcon'
import Reveal from '../ui/Reveal'

export default function WorkProcess() {
  return (
    <section
      className="work-process section scene-section"
      id="process"
      data-scene="craft"
      aria-labelledby="work-process-title"
    >
      <div className="container">
        <Reveal className="section-heading section-heading--split">
          <p className="section-label">OUR PROCESS</p>
          <h2 id="work-process-title">從理解現場，到風景落成</h2>
          <p>清楚的溝通與工序，讓每一個設計決定都回應實際需求。</p>
        </Reveal>

        <ol className="process-list">
          {processSteps.map(([number, title, description]) => (
            <Reveal as="li" key={number}>
              <span className="process-list__marker" aria-hidden="true">
                <LeafIcon name="leaf" />
              </span>
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
