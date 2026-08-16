import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="container">
        <span aria-hidden="true">404</span>
        <p className="section-label">PATH NOT FOUND</p>
        <h1>這條路還沒有風景</h1>
        <p>你可以回到首頁，或繼續瀏覽我們完成的案例。</p>
        <div className="not-found-page__actions">
          <Link to="/">回到首頁</Link>
          <Link to="/projects">瀏覽案例作品</Link>
        </div>
      </div>
    </main>
  )
}
