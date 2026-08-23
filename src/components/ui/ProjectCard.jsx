import { Link } from 'react-router-dom'
import BrandImage from './BrandImage'
import LeafIcon from './LeafIcon'

export default function ProjectCard({ project, priority = false, index }) {
  return (
    <article className="project-card">
      <Link
        className="project-card__link"
        to={`/projects/${project.slug}`}
        aria-label={`查看案例：${project.title}`}
      >
        <div
          className="project-card__media"
          style={{ '--project-focus': project.focalPoint }}
        >
          <BrandImage
            src={project.heroImage}
            alt={project.alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
          />
          <span className="project-card__category">{project.category}</span>
        </div>
        <div className="project-card__content">
          <div className="project-card__body">
            {index ? <span className="project-card__index">{index}</span> : null}
            <div>
              <h3>{project.title}</h3>
              <span>{project.location}</span>
            </div>
            <LeafIcon name="sprout" className="project-card__arrow" />
          </div>
          <p className="project-card__summary">{project.summary}</p>
          <ul
            className="project-card__services"
            aria-label={`${project.title}服務內容`}
          >
            {project.services.slice(0, 2).map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </div>
      </Link>
    </article>
  )
}
