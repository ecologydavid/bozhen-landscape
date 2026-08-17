import { Link } from 'react-router-dom'
import BrandImage from './BrandImage'
import LeafIcon from './LeafIcon'

export default function ProjectCard({ project, priority = false }) {
  return (
    <article className="project-card">
      <Link
        className="project-card__link"
        to={`/projects/${project.slug}`}
        aria-label={`查看案例：${project.title}`}
      >
        <div className="project-card__media">
          <BrandImage
            src={project.heroImage}
            alt={project.alt}
            style={{ objectPosition: project.focalPoint }}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
          />
          <span className="project-card__note">
            <LeafIcon />
            {project.location}・{project.category}
          </span>
        </div>
        <div className="project-card__body">
          <div className="project-card__meta">
            {project.services.slice(0, 2).map((service) => (
              <span key={service}>{service}</span>
            ))}
          </div>
          <div className="project-card__title-row">
            <h3>{project.title}</h3>
            <span className="project-card__arrow" aria-hidden="true">
              ↗
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
