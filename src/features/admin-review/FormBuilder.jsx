import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  fetchAllWaivers,
  createWaiverType,
  updateWaiverType,
  deleteWaiverType,
  uploadStudentDocuments,
} from '../../services/api.js'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { actorFromAuth } from '../../services/audit.js'
import {
  FIELD_REGISTRY,
  createDefaultField,
  validateSchema,
  makeUniqueId,
} from '../../utils/formSchema.js'
import { FieldRenderer } from '../forms/FieldRenderer.jsx'
import { FieldConfigPanel } from './FieldConfigPanel.jsx'
import { Toggle } from '../../components/ui/Toggle.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'

// ── Static config ────────────────────────────────────────────────────────────

// Palette order: inputs first, then choice, then file, then display-only.
const PALETTE = ['shortText', 'longText', 'number', 'date', 'select', 'radio', 'multiCheckbox', 'yesNo', 'file', 'sectionHeader', 'helpText']

// The document classes the intake wizard understands (findMissingDocs in api.js).
const REQUIRED_DOC_OPTIONS = [
  { id: 'courseList', label: 'Course list' },
  { id: 'transcript', label: 'Transcript' },
  { id: 'supporting', label: 'Supporting documents' },
]

const SECTIONS = [
  { key: 'fields', label: 'Student fields' },
  { key: 'rubric', label: 'Rubric / logic' },
  { key: 'docs', label: 'Reference docs' },
]

const countInputs = (schema) =>
  (schema ?? []).filter((f) => !FIELD_REGISTRY[f.type]?.isDisplayOnly).length

// Plain JSON deep clone (draft holds only serializable data — descriptors, not
// File objects), matching services/api.js's clone idiom.
const clone = (v) => JSON.parse(JSON.stringify(v))

// ── Left rail ────────────────────────────────────────────────────────────────

function FormListItem({ form, selected, onSelect, onArchive }) {
  // Non-interactive container; the selection button and the archive button are
  // SIBLINGS (no interactive-inside-interactive). The button fills the row.
  return (
    <div
      className={[
        'group flex items-center gap-1 rounded-xl pr-1.5 transition',
        selected ? 'bg-brand-50 ring-1 ring-brand-200 dark:ring-brand-800' : 'hover:bg-glass-hover',
        !form.active ? 'opacity-60' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onSelect(form.id)}
        aria-current={selected ? 'true' : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <span
          className={['h-2 w-2 flex-shrink-0 rounded-full', form.active ? 'bg-success-500' : 'bg-scrim-strong'].join(' ')}
          title={form.active ? 'Active — visible to students' : 'Inactive — hidden from students'}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink">{form.name || 'Untitled form'}</span>
          <span className="block text-[11px] text-muted">
            {countInputs(form.formSchema)} field{countInputs(form.formSchema) === 1 ? '' : 's'}
          </span>
        </span>
      </button>
      {form.active && (
        <button
          type="button"
          onClick={() => onArchive(form)}
          aria-label={`Archive ${form.name}`}
          title="Archive (hide from students)"
          className="flex-shrink-0 rounded-md p-1 text-muted opacity-0 transition hover:text-danger-600 focus:opacity-100 group-hover:opacity-100"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="14" height="3.5" rx="1" />
            <path d="M5 7.5V15a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 15 15V7.5" />
            <line x1="8.5" y1="10.5" x2="11.5" y2="10.5" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Field palette popover ────────────────────────────────────────────────────

// Plain popover of buttons (NOT a role=menu — we don't implement roving arrow-key
// focus). Escape + outside-click dismissal are owned by the parent's wrapper ref.
// Focuses its first option on open so keyboard users land inside it.
function FieldPalette({ onPick, onClose }) {
  const firstRef = useRef(null)
  useEffect(() => { firstRef.current?.focus() }, [])
  return (
    <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl bg-elevated p-2 shadow-lg ring-1 ring-hairline">
      <div className="grid grid-cols-2 gap-1.5">
        {PALETTE.map((type, i) => (
          <button
            key={type}
            ref={i === 0 ? firstRef : undefined}
            type="button"
            onClick={() => {
              onPick(type)
              onClose()
            }}
            className="rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink transition hover:bg-glass-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            {FIELD_REGISTRY[type].label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Fields section ───────────────────────────────────────────────────────────

function FieldRow({ field, index, total, selected, error, onSelect, onMove, onRemove }) {
  const meta = FIELD_REGISTRY[field.type]
  return (
    <li
      className={[
        'rounded-xl ring-1 transition',
        selected ? 'ring-brand-300 dark:ring-brand-700' : error ? 'ring-danger-300' : 'ring-hairline',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 p-2.5">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label="Move field up"
            className="rounded p-0.5 text-muted transition hover:text-ink disabled:opacity-30"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5-5 5 5" /></svg>
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            aria-label="Move field down"
            className="rounded p-0.5 text-muted transition hover:text-ink disabled:opacity-30"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8l5 5 5-5" /></svg>
          </button>
        </div>
        <button type="button" onClick={() => onSelect(field.id)} aria-invalid={error ? true : undefined} className="min-w-0 flex-1 text-left">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
            {error && (
              <svg className="h-3.5 w-3.5 flex-shrink-0 text-danger-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 3l7 13H3l7-13Z" /><line x1="10" y1="8.5" x2="10" y2="11.5" /><line x1="10" y1="13.5" x2="10" y2="13.6" />
              </svg>
            )}
            <span className="truncate">{field.label || <span className="text-muted">Untitled field</span>}</span>
            {field.required && <span className="text-danger-600" aria-hidden="true">*</span>}
            {error && <span className="sr-only">has errors</span>}
          </p>
          <p className="text-[11px] text-muted">{meta?.label ?? field.type}</p>
        </button>
        <button
          type="button"
          onClick={() => onRemove(field.id)}
          aria-label={`Remove ${field.label}`}
          className="rounded-md p-1 text-muted transition hover:text-danger-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" /></svg>
        </button>
      </div>
    </li>
  )
}

function RequiredDocsEditor({ value, onChange }) {
  const set = new Set(value ?? [])
  const toggle = (id) => {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange([...next])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {REQUIRED_DOC_OPTIONS.map((opt) => {
        const on = set.has(opt.id)
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            aria-pressed={on}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition',
              on ? 'bg-brand-50 text-brand-700 ring-brand-200 dark:text-brand-300 dark:ring-brand-800' : 'text-muted ring-hairline hover:bg-glass-hover',
            ].join(' ')}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Rubric section (per-form criteria) ───────────────────────────────────────

function RubricEditor({ criteria, onChange }) {
  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState('number')
  const [value, setValue] = useState('')

  const update = (id, patch) => onChange(criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const remove = (id) => onChange(criteria.filter((c) => c.id !== id))
  const add = () => {
    const trimmed = label.trim()
    if (!trimmed) return
    const id = makeUniqueId(trimmed, criteria.map((c) => c.id))
    const v = type === 'number' ? (value === '' ? 0 : Number(value)) : Boolean(value)
    onChange([...criteria, { id, label: trimmed, type, value: v, enabled: true }])
    setLabel('')
    setType('number')
    setValue('')
    setShowAdd(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted">
          These rules drive this form&apos;s automated AI recommendation. Toggle a rule off to ignore it for this form;
          edit a threshold to tune it. Added rules beyond the built-in set are recorded for reviewers but not machine-scored.
        </p>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          aria-expanded={showAdd}
          className="flex-shrink-0 glass-input rounded-lg px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-glass-hover"
        >
          {showAdd ? 'Cancel' : '+ Add rule'}
        </button>
      </div>

      {showAdd && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-scrim p-3 ring-1 ring-hairline">
          <div className="flex flex-col gap-1">
            <label htmlFor="new-rule-label" className="text-xs font-medium text-muted">Rule label</label>
            <input
              id="new-rule-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && label.trim()) add() }}
              placeholder="e.g. Minimum GPA"
              className="glass-input w-48 px-3 py-1.5 text-sm text-ink"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="new-rule-type" className="text-xs font-medium text-muted">Type</label>
            <select
              id="new-rule-type"
              value={type}
              onChange={(e) => { setType(e.target.value); setValue('') }}
              className="glass-input px-3 py-1.5 text-sm text-ink"
            >
              <option value="number">Number</option>
              <option value="boolean">Yes-No</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Default value</span>
            {type === 'number' ? (
              <input
                type="number"
                min="0"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                className="glass-input w-24 px-3 py-1.5 text-sm text-ink"
                aria-label="Default value for the new rule"
              />
            ) : (
              <div className="flex h-[34px] items-center gap-2">
                <Toggle checked={Boolean(value)} onChange={setValue} label="Default required state" />
                <span className="text-sm text-muted">{value ? 'Required' : 'Not required'}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={add}
            disabled={!label.trim()}
            className="rounded-xl bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {criteria.length === 0 ? (
        <p className="text-sm text-muted">No rules — this form will always be sent for manual review.</p>
      ) : (
        <ul className="divide-y divide-hairline" role="list">
          {criteria.map((c) => (
            <li key={c.id} className={['flex items-center gap-4 py-3', !c.enabled ? 'opacity-40' : ''].join(' ')}>
              <Toggle
                checked={c.enabled}
                onChange={(val) => update(c.id, { enabled: val })}
                label={`Enable ${c.label}`}
              />
              <span className="flex-1 text-sm text-ink">{c.label}</span>
              {c.type === 'number' ? (
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={c.value}
                  disabled={!c.enabled}
                  onChange={(e) => update(c.id, { value: e.target.value === '' ? '' : Number(e.target.value) })}
                  onBlur={(e) => { if (e.target.value === '' || Number.isNaN(c.value)) update(c.id, { value: 0 }) }}
                  className="glass-input w-24 px-3 py-1.5 text-sm disabled:opacity-50"
                  aria-label={`Value for ${c.label}`}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Toggle checked={Boolean(c.value)} onChange={(val) => update(c.id, { value: val })} label={`Required state for ${c.label}`} />
                  <span className="text-sm text-muted">{c.value ? 'Required' : 'Not required'}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(c.id)}
                aria-label={`Remove ${c.label}`}
                className="rounded-md p-1 text-muted transition hover:text-danger-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Reference docs section ───────────────────────────────────────────────────

function ReferenceDocsEditor({ docs, onChange, onError, formId }) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const remove = (id) => onChange(docs.filter((d) => d.id !== id))

  const add = async () => {
    const t = title.trim()
    if (!t && !file) return
    // Capture the form being edited when the (possibly slow) upload starts; the
    // parent ignores the result if the counselor switched forms meanwhile.
    const originFormId = formId
    setBusy(true)
    try {
      let descriptor = {}
      if (file) {
        const up = await uploadStudentDocuments([{ file, name: file.name, size: file.size, docType: 'reference' }])
        const f = up.files?.[0]
        // Keep `path` (the durable storage key) alongside `url` — on Supabase the
        // url is a 1h signed URL, so the viewer re-signs from path (mirrors the
        // student-document pattern in ReviewDetail). Demo has no path; url is permanent.
        descriptor = { fileName: f?.name ?? file.name, url: f?.url ?? null, path: f?.path ?? null, size: f?.size ?? file.size }
      }
      const entry = {
        id: `ref-${Date.now()}`,
        title: t || file?.name || 'Untitled reference',
        note: note.trim(),
        ...descriptor,
      }
      onChange([...docs, entry], originFormId)
      setTitle('')
      setNote('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      onError?.(e?.message ?? 'Could not attach the file.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Attach reference material (policy PDFs, eligibility rules, sample decisions) the AI should consult when evaluating
        this form. Stored here now — retrieval wiring is a later step, so the AI does not read these documents yet.
      </p>

      {docs.length > 0 && (
        <ul className="divide-y divide-hairline" role="list">
          {docs.map((d) => (
            <li key={d.id} className="flex items-start gap-3 py-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 2.5h6L15 6.5V16a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 16V2.5Z" />
                <path d="M11 2.5V6.5H15" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{d.title}</p>
                {d.note && <p className="mt-0.5 text-xs text-muted">{d.note}</p>}
                {d.fileName && (
                  <p className="mt-1 text-[11px] text-brand-700 dark:text-brand-300">
                    {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="hover:underline">{d.fileName}</a> : d.fileName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(d.id)}
                aria-label={`Remove ${d.title}`}
                className="rounded-md p-1 text-muted transition hover:text-danger-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-xl bg-scrim p-4 ring-1 ring-hairline">
        <div className="flex flex-col gap-1">
          <label htmlFor="ref-title" className="text-xs font-medium text-muted">Title</label>
          <input
            id="ref-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. District eligibility policy"
            className="glass-input px-3 py-1.5 text-sm text-ink"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ref-note" className="text-xs font-medium text-muted">Note for the AI <span className="font-normal">(optional)</span></label>
          <textarea
            id="ref-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What should the AI take from this document?"
            className="glass-input px-3 py-2 text-sm text-ink"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-glass-hover file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink"
            aria-label="Attach a reference file (optional)"
          />
          <button
            type="button"
            onClick={add}
            disabled={busy || (!title.trim() && !file)}
            className="ml-auto rounded-xl bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? 'Attaching…' : '+ Add reference'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function FormBuilder() {
  const { user, role } = useAuth()

  const [forms, setForms] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [dirty, setDirty] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [error, setError] = useState(null)

  const [activeSection, setActiveSection] = useState('fields')
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [showPalette, setShowPalette] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [schemaErrors, setSchemaErrors] = useState({ errors: {}, formError: null })
  const [confirmArchive, setConfirmArchive] = useState(null)
  const paletteWrapRef = useRef(null)

  // Dismiss the field palette on Escape or a click outside it. The wrapper ref
  // spans BOTH the trigger and the popover, so clicking the trigger counts as
  // "inside" and lets its own onClick toggle (no close-then-reopen race).
  useEffect(() => {
    if (!showPalette) return undefined
    const onDown = (e) => { if (paletteWrapRef.current && !paletteWrapRef.current.contains(e.target)) setShowPalette(false) }
    const onKey = (e) => { if (e.key === 'Escape') setShowPalette(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [showPalette])

  // Load a form object into a fresh editable draft + reset edit-local UI state.
  // NOT an effect keyed on `forms` — a save updates `forms`, and re-deriving the
  // draft there would clobber the post-save "Saved" toast and selected tab.
  const loadForm = useCallback((form) => {
    setSelectedId(form?.id ?? null)
    setDraft(form ? clone(form) : null)
    setDirty(false)
    setSelectedFieldId(null)
    setActiveSection('fields')
    setShowPreview(false)
    setSchemaErrors({ errors: {}, formError: null })
    setSavedMsg(false)
  }, [])

  // Load all waiver types once; auto-select the first.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAllWaivers()
      .then((all) => {
        if (cancelled) return
        setForms(all)
        setSelectedId(all[0]?.id ?? null)
        setDraft(all[0] ? clone(all[0]) : null)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message ?? 'Failed to load forms')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Switching forms discards unsaved edits — guard it.
  const selectForm = useCallback((id) => {
    if (id === selectedId) return
    if (dirty && !window.confirm('Discard unsaved changes to this form?')) return
    const found = forms.find((f) => f.id === id)
    if (found) loadForm(found)
  }, [dirty, selectedId, forms, loadForm])

  // Auto-dismiss the "Saved" confirmation.
  useEffect(() => {
    if (!savedMsg) return undefined
    const t = setTimeout(() => setSavedMsg(false), 2500)
    return () => clearTimeout(t)
  }, [savedMsg])

  const patchDraft = useCallback((patch) => {
    setDraft((d) => (d ? { ...d, ...patch } : d))
    setDirty(true)
    setSavedMsg(false)
  }, [])

  // ── Field ops ──────────────────────────────────────────────────────────────
  const addField = useCallback((type) => {
    setDraft((d) => {
      if (!d) return d
      const f = createDefaultField(type)
      if (!f) return d
      f.id = makeUniqueId(f.label, (d.formSchema ?? []).map((x) => x.id))
      setSelectedFieldId(f.id)
      return { ...d, formSchema: [...(d.formSchema ?? []), f] }
    })
    setDirty(true)
    setSavedMsg(false)
    setActiveSection('fields')
    setShowPreview(false)
  }, [])

  const updateField = useCallback((id, patch) => {
    setDraft((d) => (d ? { ...d, formSchema: d.formSchema.map((f) => (f.id === id ? { ...f, ...patch } : f)) } : d))
    setDirty(true)
    setSavedMsg(false)
  }, [])

  const removeField = useCallback((id) => {
    setDraft((d) => (d ? { ...d, formSchema: d.formSchema.filter((f) => f.id !== id) } : d))
    setSelectedFieldId((sel) => (sel === id ? null : sel))
    setDirty(true)
    setSavedMsg(false)
  }, [])

  const moveField = useCallback((index, dir) => {
    setDraft((d) => {
      if (!d) return d
      const next = [...d.formSchema]
      const target = index + dir
      if (target < 0 || target >= next.length) return d
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...d, formSchema: next }
    })
    setDirty(true)
    setSavedMsg(false)
  }, [])

  // ── Form list ops ────────────────────────────────────────────────────────────
  const handleNewForm = useCallback(async () => {
    if (dirty && !window.confirm('Discard unsaved changes to this form?')) return
    setError(null)
    try {
      const created = await createWaiverType({ name: 'Untitled form' }, actorFromAuth(user, role))
      setForms((prev) => [...prev, created])
      loadForm(created)
    } catch (e) {
      setError(e?.message ?? 'Could not create the form')
    }
  }, [dirty, user, role, loadForm])

  const handleArchive = useCallback(async (form) => {
    setConfirmArchive(null)
    setError(null)
    try {
      await deleteWaiverType(form.id, actorFromAuth(user, role))
      setForms((prev) => prev.map((f) => (f.id === form.id ? { ...f, active: false } : f)))
      setDraft((d) => (d && d.id === form.id ? { ...d, active: false } : d))
    } catch (e) {
      setError(e?.message ?? 'Could not archive the form')
    }
  }, [user, role])

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!draft) return
    const validation = validateSchema(draft.formSchema ?? [])
    if (!validation.ok) {
      setSchemaErrors(validation)
      setActiveSection('fields')
      setShowPreview(false)
      // Open the first offending field so the counselor sees what to fix.
      const firstBad = (draft.formSchema ?? []).find((f) => validation.errors[f.id])
      if (firstBad) setSelectedFieldId(firstBad.id)
      setError(validation.formError ?? 'Fix the highlighted fields before saving.')
      return
    }
    if (!String(draft.name ?? '').trim()) {
      setError('Give the form a name before saving.')
      return
    }
    setSchemaErrors({ errors: {}, formError: null })
    setSaving(true)
    setError(null)
    try {
      const patch = {
        name: draft.name,
        description: draft.description ?? '',
        active: draft.active,
        requiredDocs: draft.requiredDocs ?? [],
        formSchema: draft.formSchema ?? [],
        criteria: draft.criteria ?? [],
        referenceDocs: draft.referenceDocs ?? [],
      }
      const saved = await updateWaiverType(draft.id, patch, actorFromAuth(user, role))
      setForms((prev) => prev.map((f) => (f.id === saved.id ? saved : f)))
      setDraft(clone(saved))
      setDirty(false)
      setSavedMsg(true)
    } catch (e) {
      setError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [draft, user, role])

  const selectedField = useMemo(
    () => draft?.formSchema?.find((f) => f.id === selectedFieldId) ?? null,
    [draft, selectedFieldId],
  )

  if (loading) {
    return <section><p className="text-sm text-muted">Loading…</p></section>
  }

  return (
    <section className="fade-up space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Form Builder</h1>
          <p className="mt-1 text-sm text-muted">
            Build the forms students fill out, set the AI rubric per form, and attach reference material.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {savedMsg && <span className="text-sm font-medium text-success-700 dark:text-success-300" role="status">Saved</span>}
          {error && <span className="max-w-xs text-sm text-danger-600 dark:text-danger-400" role="alert">{error}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty || !draft}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left rail */}
        <div className="glass-card flex flex-col p-3">
          <button
            type="button"
            onClick={handleNewForm}
            className="mb-2 w-full rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            + New form
          </button>
          <div className="flex flex-col gap-1 overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
            {forms.map((form) => (
              <FormListItem
                key={form.id}
                form={form}
                selected={form.id === selectedId}
                onSelect={selectForm}
                onArchive={(f) => setConfirmArchive(f)}
              />
            ))}
          </div>
        </div>

        {/* Right pane */}
        {!draft ? (
          <div className="glass-card flex items-center justify-center p-10">
            <p className="text-sm text-muted">Select a form to edit, or create a new one.</p>
          </div>
        ) : (
          <div className="glass-card space-y-5 p-5">
            {/* Type meta */}
            <div className="space-y-4 border-b border-hairline pb-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="form-name" className="text-xs font-medium text-muted">Form name</label>
                  <input
                    id="form-name"
                    type="text"
                    value={draft.name ?? ''}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                    placeholder="Untitled form"
                    className="glass-input w-full max-w-md px-3 py-2 text-sm font-medium text-ink"
                  />
                </div>
                <div className="flex items-center gap-2.5">
                  <Toggle
                    id="form-active"
                    checked={Boolean(draft.active)}
                    onChange={(val) => patchDraft({ active: val })}
                    label={draft.active ? 'Active' : 'Inactive'}
                  />
                  <span className="text-sm text-ink">{draft.active ? 'Active — students can use it' : 'Inactive — hidden'}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="form-desc" className="text-xs font-medium text-muted">Description</label>
                <textarea
                  id="form-desc"
                  rows={2}
                  value={draft.description ?? ''}
                  onChange={(e) => patchDraft({ description: e.target.value })}
                  placeholder="What is this waiver for? Shown to students when they pick it."
                  className="glass-input px-3 py-2 text-sm text-ink"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Required documents</span>
                <RequiredDocsEditor value={draft.requiredDocs} onChange={(v) => patchDraft({ requiredDocs: v })} />
              </div>
            </div>

            {/* Section tabs */}
            <div className="flex flex-wrap gap-1.5">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveSection(s.key)}
                  aria-current={activeSection === s.key ? 'true' : undefined}
                  className={[
                    'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                    activeSection === s.key ? 'bg-brand-600 text-white' : 'text-muted hover:bg-glass-hover',
                  ].join(' ')}
                >
                  {s.label}
                  {s.key === 'fields' && countInputs(draft.formSchema) > 0 && (
                    <span className="ml-1.5 opacity-70">{countInputs(draft.formSchema)}</span>
                  )}
                  {s.key === 'docs' && (draft.referenceDocs?.length ?? 0) > 0 && (
                    <span className="ml-1.5 opacity-70">{draft.referenceDocs.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Fields section */}
            {activeSection === 'fields' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-ink">Student fields</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview((v) => !v)}
                      aria-pressed={showPreview}
                      className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover"
                    >
                      {showPreview ? 'Edit' : 'Preview'}
                    </button>
                    <div className="relative" ref={paletteWrapRef}>
                      <button
                        type="button"
                        onClick={() => setShowPalette((v) => !v)}
                        aria-expanded={showPalette}
                        aria-haspopup="true"
                        className="rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
                      >
                        + Add field
                      </button>
                      {showPalette && <FieldPalette onPick={addField} onClose={() => setShowPalette(false)} />}
                    </div>
                  </div>
                </div>

                {showPreview ? (
                  <div className="rounded-xl bg-glass-weak p-5 ring-1 ring-hairline">
                    {countInputs(draft.formSchema) === 0 && (draft.formSchema?.length ?? 0) === 0 ? (
                      <p className="text-sm text-muted">No fields yet — students will only see the standard intake steps.</p>
                    ) : (
                      <>
                        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">Student preview</p>
                        <FieldRenderer fields={draft.formSchema} answers={{}} onChange={() => {}} readOnly />
                      </>
                    )}
                  </div>
                ) : (draft.formSchema?.length ?? 0) === 0 ? (
                  <p className="rounded-xl bg-glass-weak p-6 text-center text-sm text-muted ring-1 ring-hairline">
                    No custom fields yet. Students will see only the standard steps (documents, course list).
                    Click <span className="font-medium text-ink">+ Add field</span> to ask for more.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <ul className="space-y-2" role="list">
                      {draft.formSchema.map((field, i) => (
                        <FieldRow
                          key={field.id}
                          field={field}
                          index={i}
                          total={draft.formSchema.length}
                          selected={field.id === selectedFieldId}
                          error={schemaErrors.errors[field.id]}
                          onSelect={setSelectedFieldId}
                          onMove={moveField}
                          onRemove={removeField}
                        />
                      ))}
                    </ul>
                    <div>
                      {selectedField ? (
                        <FieldConfigPanel
                          field={selectedField}
                          error={schemaErrors.errors[selectedField.id]}
                          onChange={(patch) => updateField(selectedField.id, patch)}
                        />
                      ) : (
                        <p className="rounded-xl bg-scrim p-4 text-sm text-muted ring-1 ring-hairline">
                          Select a field to configure it.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rubric section */}
            {activeSection === 'rubric' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-ink">Rubric / logic</h2>
                <RubricEditor criteria={draft.criteria ?? []} onChange={(next) => patchDraft({ criteria: next })} />
              </div>
            )}

            {/* Reference docs section */}
            {activeSection === 'docs' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-ink">Reference docs (AI context)</h2>
                <ReferenceDocsEditor
                  docs={draft.referenceDocs ?? []}
                  formId={draft.id}
                  onChange={(next, originFormId) => {
                    // Drop a late async result if the counselor switched forms mid-upload.
                    if (originFormId && draft && originFormId !== draft.id) return
                    patchDraft({ referenceDocs: next })
                  }}
                  onError={setError}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Archive confirm — reuses the focus-trapped, Escape/scrim-dismissable dialog */}
      <ConfirmDialog
        open={Boolean(confirmArchive)}
        tone="danger"
        title={`Archive "${confirmArchive?.name ?? ''}"?`}
        message="It will be hidden from students immediately. Existing requests keep their data. You can reactivate it later from this form's Active toggle."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onConfirm={() => handleArchive(confirmArchive)}
        onCancel={() => setConfirmArchive(null)}
      />
    </section>
  )
}
