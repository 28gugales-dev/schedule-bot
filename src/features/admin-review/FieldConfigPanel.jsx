import { FIELD_REGISTRY } from '../../utils/formSchema.js'
import { Toggle } from '../../components/ui/Toggle.jsx'

// Per-field configuration form for the Form Builder. Controlled — every edit
// calls onChange(patch) with a partial object the parent merges into the field.
// The field `id` is shown read-only: it is the stable key stored answers point
// at, so editing it would orphan history (spec R-m3).
//
// props: { field, onChange:(patch)=>void, error? }

function slug(label, taken = new Set()) {
  const base =
    String(label || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'option'
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

function Labelled({ label, htmlFor, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

function OptionsEditor({ field, onChange }) {
  const options = Array.isArray(field.options) ? field.options : []

  const updateOption = (i, patch) => {
    onChange({ options: options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) })
  }
  const addOption = () => {
    const taken = new Set(options.map((o) => o.value))
    const value = slug(`option ${options.length + 1}`, taken)
    onChange({ options: [...options, { value, label: `Option ${options.length + 1}` }] })
  }
  const removeOption = (i) => {
    onChange({ options: options.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted">Options</span>
      <ul className="flex flex-col gap-2">
        {options.map((opt, i) => (
          <li key={opt.value} className="flex items-center gap-2">
            <input
              type="text"
              value={opt.label}
              onChange={(e) => updateOption(i, { label: e.target.value })}
              placeholder="Option label"
              className="glass-input flex-1 px-3 py-1.5 text-sm text-ink"
              aria-label={`Option ${i + 1} label`}
            />
            <code className="rounded bg-scrim px-1.5 py-1 text-[11px] text-muted ring-1 ring-hairline" title="Stored value (frozen)">
              {opt.value}
            </code>
            <button
              type="button"
              onClick={() => removeOption(i)}
              aria-label={`Remove option ${opt.label}`}
              disabled={options.length <= 1}
              className="rounded-md p-1 text-muted transition hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l8 8M14 6l-8 8" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addOption}
        className="self-start glass-input rounded-lg px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-glass-hover"
      >
        + Add option
      </button>
    </div>
  )
}

export function FieldConfigPanel({ field, onChange, error }) {
  const meta = FIELD_REGISTRY[field?.type]
  if (!field || !meta) return null

  const isDisplayOnly = meta.isDisplayOnly
  const numOrNull = (raw) => (raw === '' ? null : Number(raw))

  return (
    <div className="space-y-4 rounded-xl bg-scrim p-4 ring-1 ring-hairline">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-300">
          {meta.label}
        </span>
        <span className="text-[11px] text-muted" title="Stable id stored answers point at — not editable">
          field id: <code className="text-ink">{field.id}</code>
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:text-danger-400">
          {error}
        </p>
      )}

      {/* Label / content */}
      {isDisplayOnly ? (
        <>
          <Labelled label="Internal label" htmlFor={`cfg-label-${field.id}`} hint="Shown in this builder list only.">
            <input
              id={`cfg-label-${field.id}`}
              type="text"
              value={field.label ?? ''}
              onChange={(e) => onChange({ label: e.target.value })}
              className="glass-input px-3 py-1.5 text-sm text-ink"
            />
          </Labelled>
          <Labelled
            label={field.type === 'sectionHeader' ? 'Section heading text' : 'Help text shown to students'}
            htmlFor={`cfg-content-${field.id}`}
          >
            <textarea
              id={`cfg-content-${field.id}`}
              rows={field.type === 'helpText' ? 3 : 2}
              value={field.content ?? ''}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder={field.type === 'sectionHeader' ? 'e.g. Medical details' : 'Guidance shown to the student…'}
              className="glass-input px-3 py-2 text-sm text-ink"
            />
          </Labelled>
        </>
      ) : (
        <>
          <Labelled label="Question / label" htmlFor={`cfg-label-${field.id}`}>
            <input
              id={`cfg-label-${field.id}`}
              type="text"
              value={field.label ?? ''}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="What are you asking the student?"
              className="glass-input px-3 py-1.5 text-sm text-ink"
            />
          </Labelled>

          <Labelled label="Help text" htmlFor={`cfg-help-${field.id}`} hint="Optional. Shown under the field.">
            <input
              id={`cfg-help-${field.id}`}
              type="text"
              value={field.helpText ?? ''}
              onChange={(e) => onChange({ helpText: e.target.value })}
              className="glass-input px-3 py-1.5 text-sm text-ink"
            />
          </Labelled>

          <div className="flex items-center gap-2.5">
            <Toggle
              id={`cfg-required-${field.id}`}
              checked={Boolean(field.required)}
              onChange={(val) => onChange({ required: val })}
              label="Required field"
            />
            <span className="text-sm text-ink">Required</span>
          </div>

          {/* Placeholder for text / number / select */}
          {(field.type === 'shortText' || field.type === 'longText' || field.type === 'number' || field.type === 'select') && (
            <Labelled label="Placeholder" htmlFor={`cfg-ph-${field.id}`}>
              <input
                id={`cfg-ph-${field.id}`}
                type="text"
                value={field.placeholder ?? ''}
                onChange={(e) => onChange({ placeholder: e.target.value })}
                className="glass-input px-3 py-1.5 text-sm text-ink"
              />
            </Labelled>
          )}

          {/* Options for choice types */}
          {meta.hasOptions && <OptionsEditor field={field} onChange={onChange} />}

          {/* Number bounds */}
          {field.type === 'number' && (
            <div className="flex flex-wrap gap-3">
              <Labelled label="Min" htmlFor={`cfg-min-${field.id}`}>
                <input
                  id={`cfg-min-${field.id}`}
                  type="number"
                  value={field.min ?? ''}
                  onChange={(e) => onChange({ min: numOrNull(e.target.value) })}
                  className="glass-input w-24 px-3 py-1.5 text-sm text-ink"
                />
              </Labelled>
              <Labelled label="Max" htmlFor={`cfg-max-${field.id}`}>
                <input
                  id={`cfg-max-${field.id}`}
                  type="number"
                  value={field.max ?? ''}
                  onChange={(e) => onChange({ max: numOrNull(e.target.value) })}
                  className="glass-input w-24 px-3 py-1.5 text-sm text-ink"
                />
              </Labelled>
              <Labelled label="Step" htmlFor={`cfg-step-${field.id}`}>
                <input
                  id={`cfg-step-${field.id}`}
                  type="number"
                  value={field.step ?? ''}
                  onChange={(e) => onChange({ step: numOrNull(e.target.value) })}
                  className="glass-input w-24 px-3 py-1.5 text-sm text-ink"
                />
              </Labelled>
            </div>
          )}

          {/* Text length cap */}
          {(field.type === 'shortText' || field.type === 'longText') && (
            <Labelled label="Max length" htmlFor={`cfg-maxlen-${field.id}`} hint="Optional character cap.">
              <input
                id={`cfg-maxlen-${field.id}`}
                type="number"
                min="1"
                value={field.maxLength ?? ''}
                onChange={(e) => onChange({ maxLength: numOrNull(e.target.value) })}
                className="glass-input w-28 px-3 py-1.5 text-sm text-ink"
              />
            </Labelled>
          )}

          {/* File config */}
          {field.type === 'file' && (
            <>
              <Labelled label="Accepted file types" htmlFor={`cfg-accept-${field.id}`} hint="Comma-separated, e.g. .pdf,.png">
                <input
                  id={`cfg-accept-${field.id}`}
                  type="text"
                  value={field.accept ?? ''}
                  onChange={(e) => onChange({ accept: e.target.value })}
                  className="glass-input px-3 py-1.5 text-sm text-ink"
                />
              </Labelled>
              <div className="flex items-center gap-2.5">
                <Toggle
                  id={`cfg-multiple-${field.id}`}
                  checked={Boolean(field.multiple)}
                  onChange={(val) => onChange({ multiple: val })}
                  label="Allow multiple files"
                />
                <span className="text-sm text-ink">Allow multiple files</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
