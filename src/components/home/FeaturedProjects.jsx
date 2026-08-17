import { Link } from 'react-router-dom'
import { projects } from '../../data/projects'
import ProjectCard from '../ui/ProjectCard'
import Reveal from '../ui/Reveal'

export default function FeaturedProjects() {
  const featuredProjects = projects.filter((project) => project.featured)

  return (
    <section className="featured-projects section">
      <div className="container">
        <Reveal className="section-heading section-heading--projects">
          <div>
            <p className="section-label">SELECTED WORKS</p>
            <h2>作品，是最直接的回答</h2>
          </div>
          <Link className="text-link" to="/projects">
            查看所有案例
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </Link>
        </Reveal>

        <div className="featured-projects__grid">
          {featuredProjects.map((project, index) => (
            <Reveal key={project.slug}>
              <ProjectCard
                project={project}
                priority={index === 0}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
