import { Link } from 'react-router-dom'
import BrandImage from './BrandImage'

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
            alt={project.title}
            loading={priority ? 'eager' : 'lazy'}
          />
          <span className="project-card__category">{project.category}</span>
        </div>
        <div className="project-card__body">
          <div>
            <h3>{project.title}</h3>
            <span>{project.location}</span>
          </div>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </div>
      </Link>
    </article>
  )
}
