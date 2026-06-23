import { useState, useEffect, useCallback } from 'react'
import { fetchAllWaivers, createWaiverType, updateWaiverType, deleteWaiverType } from '../../services/api.js'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { actorFromAuth } from '../../services/audit.js'
import { FIELD_REGISTRY, createDefaultField, makeUniqueId, validateSchema } from '../../utils/formSchema.js'
import { waiverWindowStatus, windowStatusLabel } from '../../utils/waiverWindow.js'

const DOC_OPTIONS = [
  { value: 'transcript', label: 'Transcript' },
  { value: 'courseList', label: 'Course list' },
  { value: 'supporting', label: 'Supporting document' },
]

const STATUS_STYLE = {
  open: 'bg-success-50 text-success-700 dark:text-success-300',
  scheduled: 'bg-warning-50 text-warning-700 dark:text-warning-300',
  closed: 'bg-scrim text-muted',
  inactive: 'bg-scrim text-muted',
}

// ── Toggle (shared) ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange, id, label }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
        checked ? 'bg-brand-600' : 'bg-scrim-strong',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

function StatusBadge({ status }) {
  return (
    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? 'bg-scrim text-muted'}`}>
      {windowStatusLabel(status)}
    </span>
  )
}

// ── Options editor (select / radio / multiCheckbox) ─────────────────────────
function OptionsEditor({ options = [], onChange }) {
  const setOpt = (i, label) => onChange(options.map((o, j) => (j === i ? { ...o, label } : o)))
  const addOpt = () => {
    const value = makeUniqueId('option', options.map((o) => o.value))
    onChange([...options, { value, label: '' }])
  }
  const removeOpt = (i) => onChange(options.filter((_, j) => j !== i))
  return (
    <div className="mt-2 space-y-1.5">
      <span className="text-xs font-medium text-muted">Options</span>
      {options.map((o, i) => (
        <div key={o.value} className="flex items-center gap-2">
          <input
            type="text"
            value={o.label}
            onChange={(e) => setOpt(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="glass-input flex-1 px-3 py-1.5 text-sm text-ink"
            aria-label={`Option ${i + 1} label`}
          />
          <button
            type="button"
            onClick={() => removeOpt(i)}
            className="rounded-md p-1 text-muted transition hover:text-danger-600"
            aria-label={`Remove option ${i + 1}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addOpt}
        className="text-xs font-medium text-brand-700 transition hover:text-brand-800 dark:text-brand-300"
      >
        + Add option
      </button>
    </div>
  )
}

// ── One field's editor row ──────────────────────────────────────────────────
function FieldEditorRow({ field, index, total, error, onChange, onMove, onRemove }) {
  const meta = FIELD_REGISTRY[field.type]
  const isDisplay = meta?.isDisplayOnly
  return (
    <li className="rounded-xl bg-scrim p-3 ring-1 ring-hairline">
      <div className="flex items-start gap-3">
        <span className="mt-1.5 flex-shrink-0 rounded-md bg-elevated px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-hairline">
          {meta?.label ?? field.type}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="text"
            value={field.label ?? ''}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Question label"
            className="glass-input w-full px-3 py-1.5 text-sm text-ink"
            aria-label={`Field ${index + 1} label`}
          />
          {isDisplay ? (
            <textarea
              rows={2}
              value={field.content ?? ''}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder="Body text shown to the student"
              className="glass-input w-full px-3 py-1.5 text-sm text-ink"
              aria-label={`Field ${index + 1} content`}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-ink">
                <Toggle
                  checked={Boolean(field.required)}
                  onChange={(v) => onChange({ required: v })}
                  label={`Required: ${field.label}`}
                />
                <span className="text-muted">Required</span>
              </label>
              <input
                type="text"
                value={field.helpText ?? ''}
                onChange={(e) => onChange({ helpText: e.target.value })}
                placeholder="Help text (optional)"
                className="glass-input flex-1 min-w-[8rem] px-3 py-1.5 text-sm text-ink"
                aria-label={`Field ${index + 1} help text`}
              />
            </div>
          )}
          {meta?.hasOptions && (
            <OptionsEditor options={field.options ?? []} onChange={(options) => onChange({ options })} />
          )}
          {error && <p className="text-xs text-danger-600 dark:text-danger-400" role="alert">{error}</p>}
        </div>
        <div className="flex flex-shrink-0 flex-col gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up"
            className="rounded-md p-1 text-muted transition hover:text-ink disabled:opacity-30">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 15V5M5 10l5-5 5 5" /></svg>
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move down"
            className="rounded-md p-1 text-muted transition hover:text-ink disabled:opacity-30">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 5v10M15 10l-5 5-5-5" /></svg>
          </button>
          <button type="button" onClick={onRemove} aria-label={`Remove ${field.label}`}
            className="rounded-md p-1 text-muted transition hover:text-danger-600">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" /></svg>
          </button>
        </div>
      </div>
    </li>
  )
}

// ── Full form editor (detail) ───────────────────────────────────────────────
const BLANK = { name: '', description: '', active: false, openAt: null, closeAt: null, requiredDocs: [], formSchema: [] }

function FormEditor({ waiver, onCancel, onSaved }) {
  const { user, role } = useAuth()
  const isNew = !waiver
  const [draft, setDraft] = useState(() => ({ ...BLANK, ...(waiver ?? {}) }))
  const [addType, setAddType] = useState('shortText')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const patch = (p) => setDraft((d) => ({ ...d, ...p }))

  const toggleDoc = (value) =>
    setDraft((d) => ({
      ...d,
      requiredDocs: d.requiredDocs.includes(value)
        ? d.requiredDocs.filter((x) => x !== value)
        : [...d.requiredDocs, value],
    }))

  const addField = () => {
    const f = createDefaultField(addType)
    if (!f) return
    setDraft((d) => {
      const id = makeUniqueId(f.label, d.formSchema.map((x) => x.id))
      return { ...d, formSchema: [...d.formSchema, { ...f, id }] }
    })
  }
  const patchField = (i, p) =>
    setDraft((d) => ({ ...d, formSchema: d.formSchema.map((f, j) => (j === i ? { ...f, ...p } : f)) }))
  const moveField = (i, dir) =>
    setDraft((d) => {
      const next = [...d.formSchema]
      const j = i + dir
      if (j < 0 || j >= next.length) return d
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...d, formSchema: next }
    })
  const removeField = (i) =>
    setDraft((d) => ({ ...d, formSchema: d.formSchema.filter((_, j) => j !== i) }))

  const handleSave = async () => {
    setError(null)
    setFieldErrors({})
    if (!draft.name.trim()) {
      setError('Give the form a name.')
      return
    }
    if (draft.openAt && draft.closeAt && draft.openAt > draft.closeAt) {
      setError('Close date must be on or after the open date.')
      return
    }
    const v = validateSchema(draft.formSchema)
    if (!v.ok) {
      setFieldErrors(v.errors)
      setError(v.formError ?? 'Fix the highlighted questions before saving.')
      return
    }
    setSaving(true)
    try {
      const actor = actorFromAuth(user, role)
      const body = {
        name: draft.name.trim(),
        description: draft.description ?? '',
        active: draft.active,
        requiredDocs: draft.requiredDocs,
        formSchema: draft.formSchema,
        openAt: draft.openAt || null,
        closeAt: draft.closeAt || null,
      }
      if (isNew) await createWaiverType(body, actor)
      else await updateWaiverType(waiver.id, body, actor)
      onSaved()
    } catch (e) {
      setError(e?.message ?? 'Save failed.')
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!waiver) return
    if (!window.confirm(`Archive "${waiver.name}"? Students will no longer see it.`)) return
    setSaving(true)
    try {
      await deleteWaiverType(waiver.id, actorFromAuth(user, role))
      onSaved()
    } catch (e) {
      setError(e?.message ?? 'Archive failed.')
      setSaving(false)
    }
  }

  return (
    <section className="fade-up space-y-5">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onCancel} className="text-sm font-medium text-muted transition hover:text-ink">
          ← Back to forms
        </button>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-danger-600 dark:text-danger-400" role="alert">{error}</span>}
          {!isNew && (
            <button type="button" onClick={handleArchive} disabled={saving}
              className="glass-input rounded-xl px-3 py-2 text-sm font-medium text-danger-600 transition hover:bg-glass-hover disabled:opacity-50">
              Archive
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={saving}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50">
            {saving ? 'Saving…' : isNew ? 'Create form' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Basics */}
      <div className="glass-card space-y-4 p-5">
        <h2 className="text-base font-semibold text-ink">{isNew ? 'New form' : 'Form details'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Name</span>
            <input type="text" value={draft.name} onChange={(e) => patch({ name: e.target.value })}
              placeholder="e.g. Prerequisite Override" className="glass-input px-3 py-2 text-sm text-ink" />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Toggle checked={draft.active} onChange={(v) => patch({ active: v })} label="Active" />
            <span className="text-ink">{draft.active ? 'Active — visible to students' : 'Inactive — hidden'}</span>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Description</span>
          <textarea rows={2} value={draft.description} onChange={(e) => patch({ description: e.target.value })}
            placeholder="Short explanation shown on the form card" className="glass-input px-3 py-2 text-sm text-ink" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Opens</span>
            <input type="date" value={draft.openAt ?? ''} onChange={(e) => patch({ openAt: e.target.value || null })}
              className="glass-input px-3 py-2 text-sm text-ink" />
            <span className="text-xs text-muted">Empty = open immediately.</span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Closes</span>
            <input type="date" value={draft.closeAt ?? ''} onChange={(e) => patch({ closeAt: e.target.value || null })}
              className="glass-input px-3 py-2 text-sm text-ink" />
            <span className="text-xs text-muted">Empty = never closes.</span>
          </label>
        </div>
        <div>
          <span className="text-sm font-medium text-ink">Required documents</span>
          <div className="mt-2 flex flex-wrap gap-4">
            {DOC_OPTIONS.map((d) => (
              <label key={d.value} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={draft.requiredDocs.includes(d.value)} onChange={() => toggleDoc(d.value)}
                  className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500" />
                {d.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Custom questions */}
      <div className="glass-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Custom questions</h2>
            <p className="mt-0.5 text-xs text-muted">Extra fields the student answers when applying with this form.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={addType} onChange={(e) => setAddType(e.target.value)}
              className="glass-input px-3 py-1.5 text-sm text-ink" aria-label="New question type">
              {Object.values(FIELD_REGISTRY).map((m) => (
                <option key={m.type} value={m.type}>{m.label}</option>
              ))}
            </select>
            <button type="button" onClick={addField}
              className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover">
              Add question
            </button>
          </div>
        </div>
        {draft.formSchema.length === 0 ? (
          <p className="text-sm text-muted">No custom questions — students only fill the standard fields.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {draft.formSchema.map((f, i) => (
              <FieldEditorRow
                key={f.id}
                field={f}
                index={i}
                total={draft.formSchema.length}
                error={fieldErrors[f.id]}
                onChange={(p) => patchField(i, p)}
                onMove={(dir) => moveField(i, dir)}
                onRemove={() => removeField(i)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Master list ─────────────────────────────────────────────────────────────
export function RubricBuilder() {
  const [waivers, setWaivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null) // null = list | { waiver } | { waiver: null } for new

  const load = useCallback(() => {
    setLoading(true)
    fetchAllWaivers()
      .then((w) => { setWaivers(w); setLoading(false) })
      .catch((e) => { setError(e?.message ?? 'Failed to load forms'); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  if (editing !== null) {
    return (
      <FormEditor
        waiver={editing.waiver}
        onCancel={() => setEditing(null)}
        onSaved={() => { setEditing(null); load() }}
      />
    )
  }

  return (
    <section className="fade-up space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Forms</h1>
          <p className="mt-1 text-sm text-muted">
            Each waiver form students can apply with. Click a form to edit its questions and set when it opens and closes.
          </p>
        </div>
        <button type="button" onClick={() => setEditing({ waiver: null })}
          className="flex-shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
          New form
        </button>
      </div>

      {error && <p className="text-sm text-danger-600 dark:text-danger-400" role="alert">{error}</p>}

      <div className="glass-card divide-y divide-hairline">
        {loading ? (
          <p className="p-5 text-sm text-muted">Loading…</p>
        ) : waivers.length === 0 ? (
          <p className="p-5 text-sm text-muted">No forms yet. Create one to get started.</p>
        ) : (
          waivers.map((w) => {
            const status = waiverWindowStatus(w)
            const fieldCount = w.formSchema?.length ?? 0
            const window = w.openAt || w.closeAt ? `${w.openAt ?? '—'} → ${w.closeAt ?? '—'}` : 'Always open'
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setEditing({ waiver: w })}
                className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-glass-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-inset"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{w.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {window} · {fieldCount} question{fieldCount === 1 ? '' : 's'}
                  </p>
                </div>
                <StatusBadge status={status} />
                <svg className="h-4 w-4 flex-shrink-0 text-muted" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 5l6 5-6 5" />
                </svg>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}
