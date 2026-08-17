import { Link } from 'react-router-dom'
import LeafIcon from './LeafIcon'

export default function LeafActions({ projectsHref, lineHref }) {
  return (
    <div className="leaf-actions">
      <Link className="leaf-action leaf-action--primary" to={projectsHref}>
        <LeafIcon />
        <span>瀏覽庭園作品</span>
      </Link>
      <a
        className="leaf-action leaf-action--secondary"
        href={lineHref}
        target="_blank"
        rel="noreferrer"
      >
        <LeafIcon />
        <span>LINE 諮詢</span>
      </a>
    </div>
  )
}
