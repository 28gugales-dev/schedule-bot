import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchRubricCriteria, fetchAllWaivers, updateRubricCriteria } from '../../services/api.js'

// Simple accessible toggle switch
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
        checked ? 'bg-brand-600' : 'bg-black/15',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

export function RubricBuilder() {
  const [criteria, setCriteria] = useState([])
  const [waivers, setWaivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [error, setError] = useState(null)

  // Manual "add criterion" form
  const [showAddForm, setShowAddForm] = useState(false)
  const [draftLabel, setDraftLabel] = useState('')
  const [draftType, setDraftType] = useState('number')
  const [draftValue, setDraftValue] = useState('')

  // JSON config import — error is kept separate from `error` so it renders next
  // to the import control and never collides with the load/save early-returns.
  const [importError, setImportError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchRubricCriteria(), fetchAllWaivers()])
      .then(([c, w]) => {
        if (cancelled) return
        setCriteria(c)
        setWaivers(w)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message ?? 'Failed to load')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Auto-dismiss the "Saved" confirmation; cleanup-safe across re-saves/unmount.
  useEffect(() => {
    if (!savedMsg) return undefined
    const t = setTimeout(() => setSavedMsg(false), 2500)
    return () => clearTimeout(t)
  }, [savedMsg])

  const updateCriterion = useCallback((id, patch) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    setDirty(true)
    setSavedMsg(false)
  }, [])

  const updateWaiver = useCallback((id, patch) => {
    setWaivers((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))
    setDirty(true)
    setSavedMsg(false)
  }, [])

  const removeCriterion = useCallback((id) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id))
    setDirty(true)
    setSavedMsg(false)
  }, [])

  // Stable, collision-free id from a label slug (timestamp fallback when the
  // slug is empty). `taken` is the set of ids that already exist.
  const makeUniqueId = (label, taken) => {
    const slug = String(label || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const base = `crit-${slug || Date.now()}`
    if (!taken.has(base)) return base
    let n = 2
    while (taken.has(`${base}-${n}`)) n += 1
    return `${base}-${n}`
  }

  const handleAddCriterion = useCallback(() => {
    const label = draftLabel.trim()
    if (!label) return
    setCriteria((prev) => {
      const id = makeUniqueId(label, new Set(prev.map((c) => c.id)))
      const value = draftType === 'number' ? (draftValue === '' ? 0 : Number(draftValue)) : Boolean(draftValue)
      return [...prev, { id, label, type: draftType, value, enabled: true }]
    })
    setDirty(true)
    setSavedMsg(false)
    setDraftLabel('')
    setDraftType('number')
    setDraftValue('')
    setShowAddForm(false)
  }, [draftLabel, draftType, draftValue])

  const handleImportFile = useCallback((file) => {
    setImportError(null)
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const list = Array.isArray(parsed) ? parsed : parsed?.criteria
        if (!Array.isArray(list)) {
          throw new Error('Expected an array of criteria or an object with a "criteria" array.')
        }
        const cleaned = list.map((raw, i) => {
          if (!raw || typeof raw !== 'object') {
            throw new Error(`Entry ${i + 1} is not an object.`)
          }
          if (typeof raw.label !== 'string' || !raw.label.trim()) {
            throw new Error(`Entry ${i + 1} is missing a "label".`)
          }
          if (raw.type !== 'number' && raw.type !== 'boolean') {
            throw new Error(`Entry ${i + 1} has an invalid "type" (expected "number" or "boolean").`)
          }
          const value =
            raw.value === undefined || raw.value === null
              ? raw.type === 'number' ? 0 : false
              : raw.type === 'number' ? Number(raw.value) || 0 : Boolean(raw.value)
          return {
            id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null,
            label: raw.label.trim(),
            type: raw.type,
            value,
            enabled: raw.enabled === undefined ? true : Boolean(raw.enabled),
          }
        })
        setCriteria((prev) => {
          const taken = new Set(prev.map((c) => c.id))
          const added = []
          for (const entry of cleaned) {
            if (entry.id && taken.has(entry.id)) continue // de-dupe by id
            const id = entry.id || makeUniqueId(entry.label, taken)
            taken.add(id)
            added.push({ ...entry, id })
          }
          return [...prev, ...added]
        })
        setDirty(true)
        setSavedMsg(false)
      } catch (err) {
        setImportError(err?.message ? `Import failed: ${err.message}` : 'Import failed: could not parse JSON.')
      }
    }
    reader.onerror = () => setImportError('Import failed: could not read the file.')
    reader.readAsText(file)
  }, [])

  const onFilePicked = useCallback((e) => {
    const file = e.target.files?.[0]
    handleImportFile(file)
    e.target.value = '' // allow re-importing the same file
  }, [handleImportFile])

  const onDropFile = useCallback((e) => {
    e.preventDefault()
    handleImportFile(e.dataTransfer.files?.[0])
  }, [handleImportFile])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    // Coerce empty/NaN number values to 0 at the save seam (independent of blur).
    const normalized = criteria.map((c) =>
      c.type === 'number' && (c.value === '' || Number.isNaN(c.value))
        ? { ...c, value: 0 }
        : c,
    )
    try {
      const result = await updateRubricCriteria(normalized, waivers)
      if (result?.ok !== false) {
        if (result?.criteria) setCriteria(result.criteria)
        if (result?.waivers) setWaivers(result.waivers)
        setDirty(false)
        setSavedMsg(true)
      } else {
        setError('Save returned an error — please try again.')
      }
    } catch (err) {
      setError(err?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [criteria, waivers])

  if (loading) {
    return (
      <section>
        <p className="text-sm text-muted">Loading…</p>
      </section>
    )
  }

  if (error && !criteria.length && !waivers.length) {
    return (
      <section>
        <p className="text-sm text-danger-600">{error}</p>
      </section>
    )
  }

  return (
    <section className="fade-up space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Rubric &amp; Criteria Builder</h1>
          <p className="mt-1 text-sm text-muted">
            Edit automated review rules and control which waiver types are offered to students.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {savedMsg && (
            <span className="text-sm font-medium text-success-700" role="status">
              Saved
            </span>
          )}
          {error && (
            <span className="text-sm text-danger-600" role="alert">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Section 1 — Evaluation criteria */}
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-ink">Evaluation criteria</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              aria-expanded={showAddForm}
              className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              {showAddForm ? 'Cancel' : 'Add criterion'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={onFilePicked}
              className="sr-only"
              aria-label="Import criteria from a JSON file"
            />
          </div>
        </div>

        {/* Manual add form */}
        {showAddForm && (
          <div className="mb-4 rounded-xl bg-black/[0.03] p-4 ring-1 ring-black/5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="new-criterion-label" className="text-xs font-medium text-muted">
                  Label
                </label>
                <input
                  id="new-criterion-label"
                  type="text"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && draftLabel.trim()) handleAddCriterion()
                  }}
                  placeholder="e.g. Minimum GPA"
                  className="glass-input w-48 px-3 py-1.5 text-sm text-ink"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="new-criterion-type" className="text-xs font-medium text-muted">
                  Type
                </label>
                <select
                  id="new-criterion-type"
                  value={draftType}
                  onChange={(e) => {
                    setDraftType(e.target.value)
                    setDraftValue('')
                  }}
                  className="glass-input px-3 py-1.5 text-sm text-ink"
                >
                  <option value="number">Number</option>
                  <option value="boolean">Yes-No</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted">Default value</span>
                {draftType === 'number' ? (
                  <input
                    id="new-criterion-value"
                    type="number"
                    min="0"
                    step="0.1"
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    placeholder="0"
                    className="glass-input w-24 px-3 py-1.5 text-sm text-ink"
                    aria-label="Default value for the new criterion"
                  />
                ) : (
                  <div className="flex h-[34px] items-center gap-2">
                    <Toggle
                      id="new-criterion-value"
                      checked={Boolean(draftValue)}
                      onChange={(val) => setDraftValue(val)}
                      label="Default required state for the new criterion"
                    />
                    <span className="text-sm text-muted">{draftValue ? 'Required' : 'Not required'}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddCriterion}
                disabled={!draftLabel.trim()}
                className="rounded-xl bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Drag-and-drop import area + JSON shape hint */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropFile}
          className="mb-4 rounded-xl border-2 border-dashed border-black/15 bg-white/40 px-4 py-3 text-xs text-muted backdrop-blur-sm"
        >
          Drag a <span className="font-medium text-ink">.json</span> file here, or use{' '}
          <span className="font-medium text-ink">Import JSON</span>. Expected shape:{' '}
          <code className="rounded bg-black/[0.04] px-1 py-0.5 text-[11px] text-ink ring-1 ring-black/5">
            [{'{'} "label": "Minimum GPA", "type": "number", "value": 2.5, "enabled": true {'}'}]
          </code>
        </div>
        {importError && (
          <p className="mb-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600" role="alert">
            {importError}
          </p>
        )}

        {criteria.length === 0 ? (
          <p className="text-sm text-muted">No criteria defined.</p>
        ) : (
          <ul className="divide-y divide-black/5" role="list">
            {criteria.map((criterion) => (
              <li
                key={criterion.id}
                className={[
                  'flex items-center gap-4 py-3',
                  !criterion.enabled ? 'opacity-40' : '',
                ].join(' ')}
              >
                {/* Enabled toggle */}
                <Toggle
                  id={`enabled-${criterion.id}`}
                  checked={criterion.enabled}
                  onChange={(val) => updateCriterion(criterion.id, { enabled: val })}
                  label={`Enable ${criterion.label}`}
                />

                {/* Label */}
                <label
                  htmlFor={`value-${criterion.id}`}
                  className="flex-1 text-sm text-ink select-none"
                >
                  {criterion.label}
                </label>

                {/* Value control */}
                {criterion.type === 'number' ? (
                  <input
                    id={`value-${criterion.id}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={criterion.value}
                    disabled={!criterion.enabled}
                    onChange={(e) => {
                      const raw = e.target.value
                      updateCriterion(criterion.id, {
                        value: raw === '' ? '' : Number(raw),
                      })
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || Number.isNaN(criterion.value)) {
                        updateCriterion(criterion.id, { value: 0 })
                      }
                    }}
                    className="glass-input w-24 px-3 py-1.5 text-sm disabled:opacity-50"
                    aria-label={`Value for ${criterion.label}`}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Toggle
                      id={`value-${criterion.id}`}
                      checked={Boolean(criterion.value)}
                      onChange={(val) => updateCriterion(criterion.id, { value: val })}
                      label={`Required state for ${criterion.label}`}
                    />
                    <span className="text-sm text-muted">
                      {criterion.value ? 'Required' : 'Not required'}
                    </span>
                  </div>
                )}

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeCriterion(criterion.id)}
                  aria-label={`Remove ${criterion.label}`}
                  className="flex-shrink-0 rounded-md p-1 text-muted transition hover:text-danger-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l8 8M14 6l-8 8" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Section 2 — Waiver types */}
      <div className="glass-card p-5">
        <h2 className="text-base font-semibold text-ink mb-4">Waiver types</h2>
        {waivers.length === 0 ? (
          <p className="text-sm text-muted">No waiver types defined.</p>
        ) : (
          <ul className="divide-y divide-black/5" role="list">
            {waivers.map((waiver) => (
              <li
                key={waiver.id}
                className={[
                  'flex items-center gap-4 py-3',
                  !waiver.active ? 'opacity-40' : '',
                ].join(' ')}
              >
                {/* Active toggle */}
                <Toggle
                  id={`active-${waiver.id}`}
                  checked={waiver.active}
                  onChange={(val) => updateWaiver(waiver.id, { active: val })}
                  label={`${waiver.active ? 'Deactivate' : 'Activate'} ${waiver.name}`}
                />

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{waiver.name}</p>
                  {waiver.description && (
                    <p className="text-xs text-muted mt-0.5 truncate">{waiver.description}</p>
                  )}
                </div>

                {/* Status badge */}
                <span
                  className={[
                    'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    waiver.active
                      ? 'bg-success-50 text-success-700'
                      : 'bg-black/[0.04] text-muted',
                  ].join(' ')}
                >
                  {waiver.active ? 'Active' : 'Inactive'}
                </span>

                {/* Required docs badge */}
                {Array.isArray(waiver.requiredDocs) && waiver.requiredDocs.length > 0 && (
                  <span
                    className="flex-shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                    title={waiver.requiredDocs.join(', ')}
                  >
                    {waiver.requiredDocs.length} doc{waiver.requiredDocs.length !== 1 ? 's' : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
