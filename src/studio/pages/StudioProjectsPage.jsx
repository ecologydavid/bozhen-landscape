import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProjects } from '../api/projects'
import { supabase } from '../lib/supabase'

const audienceLabels = {
  builder: '建商',
  corporate: '公司開發空間',
  luxury_home: '個人透天豪宅',
}

const statusLabels = {
  draft: '草稿',
  ready: '可生成',
  archived: '已封存',
}

export default function StudioProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let isCurrent = true

    listProjects(supabase)
      .then((rows) => {
        if (!isCurrent) return
        setProjects(rows)
        setLoadState('ready')
      })
      .catch(() => {
        if (!isCurrent) return
        setLoadState('error')
      })

    return () => {
      isCurrent = false
    }
  }, [loadAttempt])

  return (
    <section className="studio-projects-page" aria-labelledby="studio-projects-title">
      <header className="studio-page-header">
        <div>
          <p className="studio-eyebrow">內容資料庫</p>
          <h1 id="studio-projects-title">案場素材</h1>
          <p className="studio-page-description">管理案場中可公開使用的已確認資訊與素材。</p>
        </div>
        <Link className="studio-primary-link" to="/studio/projects/new">新增案場</Link>
      </header>

      {loadState === 'loading' ? (
        <div className="studio-state-card" role="status">正在載入案場…</div>
      ) : null}

      {loadState === 'error' ? (
        <div className="studio-state-card studio-state-card-error">
          <p role="alert">無法載入案場，請再試一次。</p>
          <button
            type="button"
            onClick={() => {
              setLoadState('loading')
              setLoadAttempt((attempt) => attempt + 1)
            }}
          >
            重新載入
          </button>
        </div>
      ) : null}

      {loadState === 'ready' && projects.length === 0 ? (
        <div className="studio-state-card studio-empty-state">
          <p>目前還沒有案場。</p>
          <Link to="/studio/projects/new">新增第一個案場</Link>
        </div>
      ) : null}

      {loadState === 'ready' && projects.length > 0 ? (
        <div className="studio-project-grid">
          {projects.map((project) => {
            const publicName = project.public_name || '未命名案場'

            return (
              <article className="studio-project-card" key={project.id}>
                <div className="studio-project-card-heading">
                  <div>
                    <h2>{publicName}</h2>
                    <p>內部：{project.internal_name || '未填寫'}</p>
                  </div>
                  <span className={`studio-status-badge studio-status-${project.status}`}>
                    {statusLabels[project.status] || '狀態未明'}
                  </span>
                </div>
                <dl className="studio-project-meta">
                  <div><dt>受眾</dt><dd>{audienceLabels[project.audience] || '未設定'}</dd></div>
                  <div><dt>地區</dt><dd>{project.region || '未設定'}</dd></div>
                  <div><dt>素材</dt><dd>{project.asset_count ?? 0} 張素材</dd></div>
                </dl>
                <Link
                  className="studio-secondary-link"
                  to={`/studio/projects/${project.id}`}
                  aria-label={`編輯${publicName}`}
                >
                  編輯案場
                </Link>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
