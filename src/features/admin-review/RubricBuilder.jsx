import { useState, useEffect, useCallback } from 'react'
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
        checked ? 'bg-brand-600' : 'bg-slate-300',
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

export function RubricBuilder() {
  const [criteria, setCriteria] = useState([])
  const [waivers, setWaivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [error, setError] = useState(null)

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

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await updateRubricCriteria(criteria, waivers)
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
        <p className="text-sm text-red-600">{error}</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Rubric &amp; Criteria Builder</h1>
          <p className="mt-1 text-sm text-muted">
            Edit automated review rules and control which waiver types are offered to students.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {savedMsg && (
            <span className="text-sm font-medium text-green-600" role="status">
              Saved
            </span>
          )}
          {error && (
            <span className="text-sm text-red-600" role="alert">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Section 1 — Evaluation criteria */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-ink mb-4">Evaluation criteria</h2>
        {criteria.length === 0 ? (
          <p className="text-sm text-muted">No criteria defined.</p>
        ) : (
          <ul className="divide-y divide-slate-100" role="list">
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
                    step="0.1"
                    value={criterion.value}
                    disabled={!criterion.enabled}
                    onChange={(e) =>
                      updateCriterion(criterion.id, { value: parseFloat(e.target.value) })
                    }
                    className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
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
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Section 2 — Waiver types */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-ink mb-4">Waiver types</h2>
        {waivers.length === 0 ? (
          <p className="text-sm text-muted">No waiver types defined.</p>
        ) : (
          <ul className="divide-y divide-slate-100" role="list">
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
                      ? 'bg-green-50 text-green-700'
                      : 'bg-slate-100 text-slate-500',
                  ].join(' ')}
                >
                  {waiver.active ? 'Active' : 'Inactive'}
                </span>

                {/* Required docs badge */}
                {Array.isArray(waiver.requiredDocs) && waiver.requiredDocs.length > 0 && (
                  <span
                    className="flex-shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600"
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
