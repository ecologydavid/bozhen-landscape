import { useEffect, useId, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createProject,
  getCurrentFacts,
  getProject,
  saveFactVersion,
  updateProject,
} from '../api/projects'
import { supabase } from '../lib/supabase'
import { projectFactsSchema, projectInputSchema } from '../schemas/project'

const emptyMetadata = {
  internalName: '',
  publicName: '',
  region: '',
  audience: '',
  siteType: '',
}

const emptyFacts = {
  clientNeed: '',
  services: [''],
  constraints: [''],
  approach: [''],
  verifiedMaterials: [''],
  results: [''],
  publicCta: '',
  forbiddenDetails: [''],
}

const arrayFields = [
  { name: 'services', label: '已確認服務', addLabel: '新增已確認服務' },
  { name: 'constraints', label: '限制條件', addLabel: '新增限制條件' },
  { name: 'approach', label: '執行方式', addLabel: '新增執行方式' },
  { name: 'verifiedMaterials', label: '已確認材料', addLabel: '新增已確認材料' },
  { name: 'results', label: '已確認成果', addLabel: '新增已確認成果' },
  { name: 'forbiddenDetails', label: '禁止公開細節', addLabel: '新增禁止公開細節' },
]

const validationMessages = {
  internalName: '內部名稱至少需要 2 個字',
  publicName: '公開名稱至少需要 2 個字',
  region: '地區至少需要 2 個字',
  audience: '請選擇受眾',
  siteType: '場域類型至少需要 2 個字',
  clientNeed: '客戶需求至少需要 10 個字',
  services: '至少填寫一項已確認服務',
  approach: '至少填寫一項執行方式',
  results: '至少填寫一項已確認成果',
  publicCta: '請填寫公開行動呼籲',
  constraints: '請確認限制條件的內容長度',
  verifiedMaterials: '請確認已確認材料的內容長度',
  forbiddenDetails: '請確認禁止公開細節的內容長度',
}

function toEditableArray(value) {
  return Array.isArray(value) && value.length > 0 ? value : ['']
}

function factsForEditing(facts = {}) {
  return {
    clientNeed: facts.clientNeed || '',
    services: toEditableArray(facts.services),
    constraints: toEditableArray(facts.constraints),
    approach: toEditableArray(facts.approach),
    verifiedMaterials: toEditableArray(facts.verifiedMaterials),
    results: toEditableArray(facts.results),
    publicCta: facts.publicCta || '',
    forbiddenDetails: toEditableArray(facts.forbiddenDetails),
  }
}

function factsForValidation(facts) {
  return {
    ...facts,
    services: facts.services.filter((value) => value.trim() !== ''),
    constraints: facts.constraints.filter((value) => value.trim() !== ''),
    approach: facts.approach.filter((value) => value.trim() !== ''),
    verifiedMaterials: facts.verifiedMaterials.filter((value) => value.trim() !== ''),
    results: facts.results.filter((value) => value.trim() !== ''),
    forbiddenDetails: facts.forbiddenDetails.filter((value) => value.trim() !== ''),
  }
}

function messagesFromIssues(...results) {
  const messages = {}

  for (const result of results) {
    if (result.success) continue
    for (const issue of result.error.issues) {
      const field = issue.path[0]
      if (!messages[field]) messages[field] = validationMessages[field] || '請確認此欄位'
    }
  }

  return messages
}

function StudioArrayEditor({ field, values, error, onChange }) {
  const fieldId = useId()

  function updateRow(index, value) {
    onChange(values.map((current, rowIndex) => rowIndex === index ? value : current))
  }

  function removeRow(index) {
    onChange(values.filter((_, rowIndex) => rowIndex !== index))
  }

  return (
    <fieldset className="studio-array-field" aria-describedby={error ? `${fieldId}-error` : undefined}>
      <legend>{field.label}</legend>
      <div className="studio-array-rows">
        {values.map((value, index) => (
          <div className="studio-array-row" key={`${field.name}-${index}`}>
            <label className="studio-visually-hidden" htmlFor={`${fieldId}-${index}`}>
              {field.label} {index + 1}
            </label>
            <input
              id={`${fieldId}-${index}`}
              value={value}
              onChange={(event) => updateRow(index, event.target.value)}
            />
            {values.length > 1 ? (
              <button
                className="studio-remove-button"
                type="button"
                aria-label={`移除${field.label} ${index + 1}`}
                onClick={() => removeRow(index)}
              >
                移除
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button
        className="studio-add-row-button"
        type="button"
        onClick={() => onChange([...values, ''])}
      >
        {field.addLabel}
      </button>
      {error ? <p className="studio-field-error" id={`${fieldId}-error`}>{error}</p> : null}
    </fieldset>
  )
}

export default function StudioProjectEditorPage({ mode = 'create' }) {
  const { projectId } = useParams()
  const isEdit = mode === 'edit'
  const [metadata, setMetadata] = useState(emptyMetadata)
  const [facts, setFacts] = useState(emptyFacts)
  const [loadState, setLoadState] = useState(isEdit ? 'loading' : 'ready')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saveState, setSaveState] = useState('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [currentVersion, setCurrentVersion] = useState(null)
  const [persistedProjectId, setPersistedProjectId] = useState(null)

  useEffect(() => {
    if (!isEdit) return undefined
    let isCurrent = true

    Promise.all([
      getProject(supabase, projectId),
      getCurrentFacts(supabase, projectId),
    ])
      .then(([project, currentFacts]) => {
        if (!isCurrent) return
        if (!project) {
          setLoadState('missing')
          return
        }

        setMetadata({
          internalName: project.internal_name || '',
          publicName: project.public_name || '',
          region: project.region || '',
          audience: project.audience || '',
          siteType: project.site_type || '',
        })
        setFacts(factsForEditing(currentFacts?.facts))
        setCurrentVersion(currentFacts?.version ?? null)
        setPersistedProjectId(project.id)
        setLoadState('ready')
      })
      .catch(() => {
        if (isCurrent) setLoadState('error')
      })

    return () => {
      isCurrent = false
    }
  }, [isEdit, loadAttempt, projectId])

  function updateMetadata(field, value) {
    setMetadata((current) => ({ ...current, [field]: value }))
  }

  function updateFacts(field, value) {
    setFacts((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saveState === 'saving') return

    setSaveMessage('')
    const projectResult = projectInputSchema.safeParse(metadata)
    const factsResult = projectFactsSchema.safeParse(factsForValidation(facts))
    const errors = messagesFromIssues(projectResult, factsResult)
    setFieldErrors(errors)

    if (!projectResult.success || !factsResult.success) {
      setSaveState('validation-error')
      return
    }

    setSaveState('saving')
    let targetProjectId = persistedProjectId || projectId

    try {
      if (isEdit || targetProjectId) {
        await updateProject(supabase, targetProjectId, projectResult.data)
      } else {
        const created = await createProject(supabase, projectResult.data)
        targetProjectId = created.id
      }
      setPersistedProjectId(targetProjectId)
    } catch {
      setSaveMessage('無法儲存案場資料，請再試一次。')
      setSaveState('metadata-error')
      return
    }

    try {
      const saved = await saveFactVersion(supabase, targetProjectId, factsResult.data)
      setCurrentVersion(saved.version)
      setSaveMessage(`已儲存事實卡版本 ${saved.version}`)
      setSaveState('success')
    } catch {
      setSaveMessage('案場資料已儲存，但事實卡版本儲存失敗，請再試一次。')
      setSaveState('facts-error')
    }
  }

  if (loadState === 'loading') {
    return (
      <section className="studio-project-editor">
        <h1>編輯案場</h1>
        <div className="studio-state-card" role="status">正在載入案場…</div>
      </section>
    )
  }

  if (loadState === 'missing') {
    return (
      <section className="studio-project-editor">
        <h1>編輯案場</h1>
        <div className="studio-state-card studio-state-card-error">
          <p role="alert">找不到這個案場。</p>
          <Link to="/studio/projects">返回案場列表</Link>
        </div>
      </section>
    )
  }

  if (loadState === 'error') {
    return (
      <section className="studio-project-editor">
        <h1>編輯案場</h1>
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
      </section>
    )
  }

  return (
    <section className="studio-project-editor" aria-labelledby="studio-editor-title">
      <header className="studio-page-header">
        <div>
          <p className="studio-eyebrow">案場事實卡</p>
          <h1 id="studio-editor-title">{isEdit ? '編輯案場' : '新增案場'}</h1>
          <p className="studio-page-description">只填入已確認、可追溯的案場事實。</p>
        </div>
        {currentVersion ? <span className="studio-version-badge">目前版本 {currentVersion}</span> : null}
      </header>

      <form className="studio-editor-form" noValidate onSubmit={handleSubmit}>
        <div className="studio-editor-columns">
          <fieldset className="studio-form-card">
            <legend>案場資料</legend>
            <div className="studio-field">
              <label htmlFor="studio-internal-name">內部名稱</label>
              <input id="studio-internal-name" value={metadata.internalName} onChange={(event) => updateMetadata('internalName', event.target.value)} />
              {fieldErrors.internalName ? <p className="studio-field-error">{fieldErrors.internalName}</p> : null}
            </div>
            <div className="studio-field">
              <label htmlFor="studio-public-name">公開名稱</label>
              <input id="studio-public-name" value={metadata.publicName} onChange={(event) => updateMetadata('publicName', event.target.value)} />
              {fieldErrors.publicName ? <p className="studio-field-error">{fieldErrors.publicName}</p> : null}
            </div>
            <div className="studio-field">
              <label htmlFor="studio-region">地區</label>
              <input id="studio-region" value={metadata.region} onChange={(event) => updateMetadata('region', event.target.value)} />
              {fieldErrors.region ? <p className="studio-field-error">{fieldErrors.region}</p> : null}
            </div>
            <div className="studio-field">
              <label htmlFor="studio-audience">受眾</label>
              <select id="studio-audience" value={metadata.audience} onChange={(event) => updateMetadata('audience', event.target.value)}>
                <option value="">請選擇受眾</option>
                <option value="builder">建商</option>
                <option value="corporate">公司開發空間</option>
                <option value="luxury_home">個人透天豪宅</option>
              </select>
              {fieldErrors.audience ? <p className="studio-field-error">{fieldErrors.audience}</p> : null}
            </div>
            <div className="studio-field">
              <label htmlFor="studio-site-type">場域類型</label>
              <input id="studio-site-type" value={metadata.siteType} onChange={(event) => updateMetadata('siteType', event.target.value)} />
              {fieldErrors.siteType ? <p className="studio-field-error">{fieldErrors.siteType}</p> : null}
            </div>
          </fieldset>

          <fieldset className="studio-form-card">
            <legend>核心敘述</legend>
            <div className="studio-field">
              <label htmlFor="studio-client-need">客戶需求</label>
              <textarea id="studio-client-need" rows="5" value={facts.clientNeed} onChange={(event) => updateFacts('clientNeed', event.target.value)} />
              {fieldErrors.clientNeed ? <p className="studio-field-error">{fieldErrors.clientNeed}</p> : null}
            </div>
            <div className="studio-field">
              <label htmlFor="studio-public-cta">公開行動呼籲</label>
              <textarea id="studio-public-cta" rows="3" value={facts.publicCta} onChange={(event) => updateFacts('publicCta', event.target.value)} />
              {fieldErrors.publicCta ? <p className="studio-field-error">{fieldErrors.publicCta}</p> : null}
            </div>
          </fieldset>
        </div>

        <div className="studio-facts-grid">
          {arrayFields.map((field) => (
            <StudioArrayEditor
              key={field.name}
              field={field}
              values={facts[field.name]}
              error={fieldErrors[field.name]}
              onChange={(value) => updateFacts(field.name, value)}
            />
          ))}
        </div>

        {saveMessage ? (
          <p
            className={saveState === 'success' ? 'studio-save-success' : 'studio-save-error'}
            role={saveState === 'success' ? 'status' : 'alert'}
          >
            {saveMessage}
          </p>
        ) : null}

        <div className="studio-form-actions">
          <Link className="studio-secondary-link" to="/studio/projects">取消並返回案場列表</Link>
          <button className="studio-primary-button" type="submit" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? '儲存中…' : '儲存事實卡版本'}
          </button>
        </div>
      </form>
    </section>
  )
}
