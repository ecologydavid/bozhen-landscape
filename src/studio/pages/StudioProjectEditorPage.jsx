import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ProjectIdCollisionError,
  createProject,
  getCurrentFacts,
  getProject,
  saveFactVersion,
  updateProject,
} from '../api/projects'
import FactArrayField from '../components/FactArrayField'
import ProjectAssetManager from '../components/ProjectAssetManager'
import {
  clearCreateProjectDraft,
  clearCreateProjectId,
  clearFactAttempt,
  getOrCreateCreateProjectId,
  readCreateProjectDraft,
  readFactAttempt,
  reconcileFactAttempt,
  recoverLoadedFactAttempt,
  replaceCreateProjectId,
  writeCreateProjectDraft,
  writeFactAttempt,
} from '../lib/projectRecovery'
import { supabase } from '../lib/supabase'
import { projectFactsSchema, projectInputSchema } from '../schemas/project'

const arrayFieldNames = [
  'services',
  'constraints',
  'approach',
  'verifiedMaterials',
  'results',
  'forbiddenDetails',
]

const emptyMetadata = {
  internalName: '',
  publicName: '',
  region: '',
  audience: '',
  siteType: '',
}

const arrayFields = [
  { name: 'services', label: '已確認服務', addLabel: '新增已確認服務' },
  { name: 'constraints', label: '限制條件', addLabel: '新增限制條件' },
  { name: 'approach', label: '執行方式', addLabel: '新增執行方式' },
  { name: 'verifiedMaterials', label: '已確認材料', addLabel: '新增已確認材料' },
  { name: 'results', label: '已確認成果', addLabel: '新增已確認成果' },
  { name: 'forbiddenDetails', label: '禁止公開細節', addLabel: '新增禁止公開細節' },
]

const fieldLabels = {
  internalName: '內部名稱',
  publicName: '公開名稱',
  region: '地區',
  audience: '受眾',
  siteType: '場域類型',
  clientNeed: '客戶需求',
  services: '已確認服務',
  constraints: '限制條件',
  approach: '執行方式',
  verifiedMaterials: '已確認材料',
  results: '已確認成果',
  publicCta: '公開行動呼籲',
  forbiddenDetails: '禁止公開細節',
}

const requiredArrayMessages = {
  services: '至少填寫一項已確認服務',
  approach: '至少填寫一項執行方式',
  results: '至少填寫一項已確認成果',
}

function createFactRow(value = '') {
  return { id: globalThis.crypto.randomUUID(), value }
}

function toEditableRows(values) {
  const editableValues = Array.isArray(values) && values.length > 0 ? values : ['']
  return editableValues.map((value) => createFactRow(value))
}

function emptyFactsForEditing() {
  return {
    clientNeed: '',
    services: toEditableRows([]),
    constraints: toEditableRows([]),
    approach: toEditableRows([]),
    verifiedMaterials: toEditableRows([]),
    results: toEditableRows([]),
    publicCta: '',
    forbiddenDetails: toEditableRows([]),
  }
}

function factsForEditing(facts = {}) {
  return {
    clientNeed: facts.clientNeed || '',
    services: toEditableRows(facts.services),
    constraints: toEditableRows(facts.constraints),
    approach: toEditableRows(facts.approach),
    verifiedMaterials: toEditableRows(facts.verifiedMaterials),
    results: toEditableRows(facts.results),
    publicCta: facts.publicCta || '',
    forbiddenDetails: toEditableRows(facts.forbiddenDetails),
  }
}

function factsForValidation(editableFacts) {
  const facts = {
    clientNeed: editableFacts.clientNeed,
    publicCta: editableFacts.publicCta,
  }
  const indexMaps = {}

  for (const field of arrayFieldNames) {
    facts[field] = []
    indexMaps[field] = []
    editableFacts[field].forEach((row, rowIndex) => {
      if (row.value.trim() === '') return
      facts[field].push(row.value)
      indexMaps[field].push(rowIndex)
    })
  }

  return { facts, indexMaps }
}

function issueMessage(issue) {
  const field = issue.path[0]
  const label = fieldLabels[field] || '此欄位'
  const isArrayItem = typeof issue.path[1] === 'number'

  if (field === 'audience') return '請選擇受眾'
  if (issue.code === 'too_small' && !isArrayItem && requiredArrayMessages[field]) {
    return requiredArrayMessages[field]
  }
  if (issue.code === 'too_small') {
    return `${label}${isArrayItem ? '每項' : ''}至少需要 ${issue.minimum} 個字`
  }
  if (issue.code === 'too_big') {
    return `${label}${isArrayItem ? '每項' : ''}不可超過 ${issue.maximum} 個字`
  }
  return `請確認${label}`
}

function errorsFromIssues(results, indexMaps) {
  const errors = {}

  for (const result of results) {
    if (result.success) continue
    for (const issue of result.error.issues) {
      const field = issue.path[0]
      const submittedIndex = issue.path[1]
      const rowIndex = typeof submittedIndex === 'number'
        ? indexMaps[field]?.[submittedIndex]
        : undefined
      if (!errors[field]) {
        errors[field] = {
          message: issueMessage(issue),
          itemIndexes: rowIndex === undefined ? [] : [rowIndex],
        }
      } else if (rowIndex !== undefined && !errors[field].itemIndexes.includes(rowIndex)) {
        errors[field].itemIndexes.push(rowIndex)
      }
    }
  }

  return errors
}

async function saveFactsRecoverably(projectId, facts, baselineVersion, isActive) {
  const pendingAttempt = readFactAttempt(projectId)

  if (pendingAttempt) {
    let currentFacts
    try {
      currentFacts = await getCurrentFacts(supabase, projectId)
    } catch {
      throw new Error('fact attempt unresolved')
    }
    if (!isActive()) return null

    const reconciliation = reconcileFactAttempt(
      projectId,
      currentFacts,
      facts,
      baselineVersion,
    )
    if (reconciliation.status === 'confirmed') return reconciliation.currentFacts
    baselineVersion = reconciliation.baselineVersion
  }

  if (!isActive()) return null
  writeFactAttempt(projectId, facts, baselineVersion)

  try {
    const saved = await saveFactVersion(supabase, projectId, facts)
    if (!isActive()) return null
    clearFactAttempt(projectId)
    return saved
  } catch {
    if (!isActive()) return null
    try {
      const currentFacts = await getCurrentFacts(supabase, projectId)
      if (!isActive()) return null
      const reconciliation = reconcileFactAttempt(
        projectId,
        currentFacts,
        facts,
        baselineVersion,
      )
      if (reconciliation.status === 'confirmed') return reconciliation.currentFacts
    } catch {
      // Keep the attempt for the next reconciliation.
    }
    throw new Error('fact attempt unresolved')
  }
}

function MetadataInput({ id, label, value, error, onChange }) {
  const errorId = `${id}-error`
  return (
    <div className="studio-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="studio-field-error" id={errorId}>{error.message}</p> : null}
    </div>
  )
}

function StudioProjectEditor({ mode, projectId }) {
  const navigate = useNavigate()
  const isEdit = mode === 'edit'
  const [recoveredCreateDraft] = useState(
    () => isEdit ? null : readCreateProjectDraft(),
  )
  const [createProjectId, setCreateProjectId] = useState(
    () => isEdit ? null : recoveredCreateDraft?.projectId ?? getOrCreateCreateProjectId(),
  )
  const [metadata, setMetadata] = useState(
    () => recoveredCreateDraft?.metadata ?? { ...emptyMetadata },
  )
  const [facts, setFacts] = useState(() => {
    if (isEdit) return emptyFactsForEditing()
    if (recoveredCreateDraft) return factsForEditing(recoveredCreateDraft.facts)
    const pendingAttempt = readFactAttempt(createProjectId)
    return pendingAttempt ? factsForEditing(pendingAttempt.facts) : emptyFactsForEditing()
  })
  const [loadState, setLoadState] = useState(isEdit ? 'loading' : 'ready')
  const [loadedProjectId, setLoadedProjectId] = useState(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saveState, setSaveState] = useState('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState(
    () => recoveredCreateDraft
      ? '已還原上次未完成的新增案場內容；請再次儲存以完成建立。'
      : '',
  )
  const [currentVersion, setCurrentVersion] = useState(null)
  const formRef = useRef(null)
  const isMountedRef = useRef(true)
  const saveGenerationRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      saveGenerationRef.current += 1
    }
  }, [])

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
          setLoadedProjectId(projectId)
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
        const recovery = recoverLoadedFactAttempt(projectId, currentFacts)
        setFacts(factsForEditing(recovery.facts))
        setCurrentVersion(recovery.version)
        setRecoveryMessage(
          recovery.status === 'pending'
            ? '已還原上次未確認的事實卡內容；請再次儲存以核對並完成版本。'
            : '',
        )
        setLoadedProjectId(projectId)
        setLoadState('ready')
      })
      .catch(() => {
        if (!isCurrent) return
        setLoadedProjectId(projectId)
        setLoadState('error')
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
    const saveGeneration = saveGenerationRef.current + 1
    saveGenerationRef.current = saveGeneration
    const isActive = () => isMountedRef.current
      && saveGenerationRef.current === saveGeneration

    setSaveMessage('')
    const preparedFacts = factsForValidation(facts)
    const projectResult = projectInputSchema.safeParse(metadata)
    const factsResult = projectFactsSchema.safeParse(preparedFacts.facts)
    const errors = errorsFromIssues([projectResult, factsResult], preparedFacts.indexMaps)
    setFieldErrors(errors)

    if (!projectResult.success || !factsResult.success) {
      setSaveState('validation-error')
      queueMicrotask(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    setSaveState('saving')
    const targetProjectId = isEdit ? projectId : createProjectId

    try {
      if (isEdit) {
        await updateProject(supabase, projectId, projectResult.data)
      } else {
        writeCreateProjectDraft({
          projectId: targetProjectId,
          metadata: projectResult.data,
          facts: factsResult.data,
          baselineVersion: currentVersion,
        })
        await createProject(supabase, projectResult.data, { projectId: targetProjectId })
      }
      if (!isActive()) return
    } catch (error) {
      if (!isActive()) return
      if (!isEdit && error instanceof ProjectIdCollisionError) {
        clearFactAttempt(createProjectId)
        const replacementProjectId = replaceCreateProjectId()
        writeCreateProjectDraft({
          projectId: replacementProjectId,
          metadata: projectResult.data,
          facts: factsResult.data,
          baselineVersion: currentVersion,
        })
        setCreateProjectId(replacementProjectId)
        setSaveMessage('新增識別碼已更新，請再試一次。')
        setSaveState('metadata-error')
        return
      }
      setSaveMessage('無法儲存案場資料，請再試一次。')
      setSaveState('metadata-error')
      return
    }

    try {
      const saved = await saveFactsRecoverably(
        targetProjectId,
        factsResult.data,
        currentVersion,
        isActive,
      )
      if (!isActive() || !saved) return
      setCurrentVersion(saved.version)
      setSaveMessage(`已儲存事實卡版本 ${saved.version}`)
      setRecoveryMessage('')
      setSaveState('success')
      if (!isEdit) {
        clearCreateProjectDraft()
        clearCreateProjectId()
        navigate(`/studio/projects/${targetProjectId}`, { replace: true })
      }
    } catch {
      if (!isActive()) return
      setSaveMessage('案場資料已儲存，但事實卡版本狀態尚待確認；請再試一次以安全地核對後續動作。')
      setSaveState('facts-error')
    }
  }

  function handleCancel() {
    if (!isEdit) {
      clearFactAttempt(createProjectId)
      clearCreateProjectDraft()
      clearCreateProjectId()
    }
  }

  if (isEdit && loadState === 'missing' && loadedProjectId === projectId) {
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

  if (isEdit && loadState === 'error' && loadedProjectId === projectId) {
    return (
      <section className="studio-project-editor">
        <h1>編輯案場</h1>
        <div className="studio-state-card studio-state-card-error">
          <p role="alert">無法載入案場，請再試一次。</p>
          <button
            type="button"
            onClick={() => {
              setLoadState('loading')
              setLoadedProjectId(null)
              setLoadAttempt((attempt) => attempt + 1)
            }}
          >
            重新載入
          </button>
        </div>
      </section>
    )
  }

  if (isEdit && (loadState !== 'ready' || loadedProjectId !== projectId)) {
    return (
      <section className="studio-project-editor">
        <h1>編輯案場</h1>
        <div className="studio-state-card" role="status">正在載入案場…</div>
      </section>
    )
  }

  const validationFailed = saveState === 'validation-error'
  const audienceError = fieldErrors.audience
  const clientNeedError = fieldErrors.clientNeed
  const publicCtaError = fieldErrors.publicCta

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

      <form ref={formRef} className="studio-editor-form" noValidate onSubmit={handleSubmit}>
        {recoveryMessage ? (
          <p className="studio-recovery-warning" role="alert">{recoveryMessage}</p>
        ) : null}

        {validationFailed ? (
          <div className="studio-validation-summary" role="alert">
            請修正表單中的欄位，再重新儲存。
          </div>
        ) : null}

        <div className="studio-editor-columns">
          <fieldset className="studio-form-card">
            <legend>案場資料</legend>
            <MetadataInput id="studio-internal-name" label="內部名稱" value={metadata.internalName} error={fieldErrors.internalName} onChange={(value) => updateMetadata('internalName', value)} />
            <MetadataInput id="studio-public-name" label="公開名稱" value={metadata.publicName} error={fieldErrors.publicName} onChange={(value) => updateMetadata('publicName', value)} />
            <MetadataInput id="studio-region" label="地區" value={metadata.region} error={fieldErrors.region} onChange={(value) => updateMetadata('region', value)} />
            <div className="studio-field">
              <label htmlFor="studio-audience">受眾</label>
              <select
                id="studio-audience"
                value={metadata.audience}
                aria-invalid={audienceError ? true : undefined}
                aria-describedby={audienceError ? 'studio-audience-error' : undefined}
                onChange={(event) => updateMetadata('audience', event.target.value)}
              >
                <option value="">請選擇受眾</option>
                <option value="builder">建商</option>
                <option value="corporate">公司開發空間</option>
                <option value="luxury_home">個人透天豪宅</option>
              </select>
              {audienceError ? <p className="studio-field-error" id="studio-audience-error">{audienceError.message}</p> : null}
            </div>
            <MetadataInput id="studio-site-type" label="場域類型" value={metadata.siteType} error={fieldErrors.siteType} onChange={(value) => updateMetadata('siteType', value)} />
          </fieldset>

          <fieldset className="studio-form-card">
            <legend>核心敘述</legend>
            <div className="studio-field">
              <label htmlFor="studio-client-need">客戶需求</label>
              <textarea
                id="studio-client-need"
                rows="5"
                value={facts.clientNeed}
                aria-invalid={clientNeedError ? true : undefined}
                aria-describedby={clientNeedError ? 'studio-client-need-error' : undefined}
                onChange={(event) => updateFacts('clientNeed', event.target.value)}
              />
              {clientNeedError ? <p className="studio-field-error" id="studio-client-need-error">{clientNeedError.message}</p> : null}
            </div>
            <div className="studio-field">
              <label htmlFor="studio-public-cta">公開行動呼籲</label>
              <textarea
                id="studio-public-cta"
                rows="3"
                value={facts.publicCta}
                aria-invalid={publicCtaError ? true : undefined}
                aria-describedby={publicCtaError ? 'studio-public-cta-error' : undefined}
                onChange={(event) => updateFacts('publicCta', event.target.value)}
              />
              {publicCtaError ? <p className="studio-field-error" id="studio-public-cta-error">{publicCtaError.message}</p> : null}
            </div>
          </fieldset>
        </div>

        <div className="studio-facts-grid">
          {arrayFields.map((field) => (
            <FactArrayField
              key={field.name}
              field={field}
              rows={facts[field.name]}
              error={fieldErrors[field.name]}
              createRow={createFactRow}
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
          <Link className="studio-secondary-link" to="/studio/projects" onClick={handleCancel}>取消並返回案場列表</Link>
          <button className="studio-primary-button" type="submit" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? '儲存中…' : '儲存事實卡版本'}
          </button>
        </div>
      </form>
      {isEdit ? <ProjectAssetManager client={supabase} projectId={projectId} /> : null}
    </section>
  )
}

export default function StudioProjectEditorPage({ mode = 'create' }) {
  const { projectId } = useParams()
  const identity = `${mode}:${projectId || ''}`
  return <StudioProjectEditor key={identity} mode={mode} projectId={projectId} />
}
