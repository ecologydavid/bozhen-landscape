import { useState } from 'react'
import { projectCategories, projects } from '../data/projects'
import ProjectCard from '../components/ui/ProjectCard'

export default function ProjectsPage() {
  const [activeCategory, setActiveCategory] = useState('全部')
  const visibleProjects =
    activeCategory === '全部'
      ? projects
      : projects.filter((project) => project.category === activeCategory)

  return (
    <main className="projects-page">
      <header className="projects-masthead">
        <div className="container">
          <p className="section-label">OUR WORKS</p>
          <h1>讓作品，說明我們如何對待每一處風景</h1>
          <p>住宅庭園、植栽綠化、假山水景與共享空間的實作案例。</p>
        </div>
      </header>

      <section className="projects-index section" aria-label="案例作品">
        <div className="container">
          <div className="project-filters" aria-label="案例分類">
            {projectCategories.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <p className="projects-index__count" aria-live="polite">
            {String(visibleProjects.length).padStart(2, '0')} PROJECTS
          </p>

          <div className="projects-index__grid">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
