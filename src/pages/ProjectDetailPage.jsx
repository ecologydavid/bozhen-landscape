import { Link, useParams } from 'react-router-dom'
import BrandImage from '../components/ui/BrandImage'
import ProjectCard from '../components/ui/ProjectCard'
import { projects } from '../data/projects'

function MissingProject() {
  return (
    <main className="missing-project">
      <div className="container">
        <p className="section-label">PROJECT NOT FOUND</p>
        <h1>找不到這個案例</h1>
        <p>這個案例可能已移動，或尚未公開。</p>
        <div className="missing-project__actions">
          <Link to="/projects">返回案例作品</Link>
          <a href="/#quote">直接詢問報價</a>
        </div>
      </div>
    </main>
  )
}

export default function ProjectDetailPage() {
  const { slug } = useParams()
  const project = projects.find((item) => item.slug === slug)

  if (!project) return <MissingProject />

  const relatedProjects = projects
    .filter(
      (item) => item.slug !== project.slug && item.category === project.category,
    )
    .slice(0, 2)

  return (
    <main className="project-detail">
      <header className="project-hero">
        <BrandImage
          className="project-hero__image"
          src={project.heroImage}
          alt={project.title}
          fetchPriority="high"
        />
        <div className="project-hero__shade" aria-hidden="true" />
        <div className="container project-hero__content">
          <Link to="/projects">案例作品</Link>
          <p>{project.category}</p>
          <h1>{project.title}</h1>
          <span>{project.location}</span>
        </div>
      </header>

      <section className="project-narrative section">
        <div className="container project-narrative__grid">
          <div>
            <p className="section-label">THE BRIEF</p>
            <h2>空間需求</h2>
            <p>{project.clientNeed}</p>
          </div>
          <div>
            <p className="section-label">OUR APPROACH</p>
            <h2>設計作法</h2>
            <p>{project.designApproach}</p>
          </div>
        </div>
      </section>

      <section className="project-materials">
        <div className="container project-materials__inner">
          <h2>主要配置</h2>
          <ul>
            {project.materials.map((material) => (
              <li key={material}>{material}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="project-gallery section" aria-label="案例圖集">
        <div className="container project-gallery__grid">
          {project.gallery.map((image, index) => (
            <BrandImage
              key={`${image}-${index}`}
              src={image}
              alt={`${project.title}案例照片 ${index + 1}`}
              loading="lazy"
            />
          ))}
        </div>
      </section>

      <section className="project-cta section">
        <div className="container">
          <p className="section-label">YOUR SPACE, NEXT</p>
          <h2>也想讓空間長出自己的風景？</h2>
          <a href="/#quote">取得專屬報價</a>
        </div>
      </section>

      {relatedProjects.length ? (
        <section className="related-projects section">
          <div className="container">
            <h2>延伸案例</h2>
            <div className="related-projects__grid">
              {relatedProjects.map((item) => (
                <ProjectCard key={item.slug} project={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}
