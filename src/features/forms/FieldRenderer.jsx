import { useId } from 'react'
import { FIELD_REGISTRY } from '../../utils/formSchema.js'
import { UploadZone } from '../student-portal/UploadZone.jsx'

// Shared 11-type render seam. Editable in the student wizard ("Additional
// questions" step); read-only in the FormBuilder preview. Controlled — all
// answer state lives in the parent (WaiverIntake / FormBuilder).
//
// props: { fields, answers, onChange, errors, readOnly }

// FieldShell wraps every INPUT field with the a11y scaffold:
//   <label htmlFor> (or <legend> for grouped inputs), required *, helpText via
//   aria-describedby, inline error <p role="alert">. Display-only types skip it.
function FieldShell({ field, errorId, helpId, error, children, asFieldset = false }) {
  const Wrapper = asFieldset ? 'fieldset' : 'div'
  const Label = asFieldset ? 'legend' : 'label'
  return (
    <Wrapper className="space-y-1.5">
      <Label
        {...(asFieldset ? {} : { htmlFor: field.id })}
        className="block text-sm font-medium text-ink"
      >
        {field.label}
        {field.required && (
          <span className="ml-0.5 text-danger-600" aria-hidden="true">*</span>
        )}
      </Label>
      {field.helpText && (
        <p id={helpId} className="text-xs text-muted">{field.helpText}</p>
      )}
      {children}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger-700 dark:text-danger-300">
          {error}
        </p>
      )}
    </Wrapper>
  )
}

export function FieldRenderer({ fields = [], answers = {}, onChange, errors = {}, readOnly = false }) {
  return (
    <div className="space-y-5">
      {fields.map((field) => (
        <FieldNode
          key={field.id}
          field={field}
          value={answers[field.id]}
          onChange={onChange}
          error={errors[field.id]}
          readOnly={readOnly}
        />
      ))}
    </div>
  )
}

function FieldNode({ field, value, onChange, error, readOnly }) {
  const uid = useId()
  const meta = FIELD_REGISTRY[field.type]

  // Unknown field type (older client meets newer schema) → render nothing,
  // never throw. (Spec R4 / T12.)
  if (!meta) return null

  // Display-only types: no FieldShell, no answer, no error wiring.
  if (meta.isDisplayOnly) {
    if (field.type === 'sectionHeader') {
      return (
        <h3 className="border-b border-hairline pb-1.5 pt-2 text-sm font-semibold uppercase tracking-wide text-ink">
          {field.content || field.label}
        </h3>
      )
    }
    // helpText
    return <p className="text-sm text-muted">{field.content || field.label}</p>
  }

  const errorId = error ? `${uid}-err` : undefined
  const helpId = field.helpText ? `${uid}-help` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined

  const handle = (next) => { if (!readOnly) onChange(field.id, next) }

  return renderControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly })
}

function renderControl(ctx) {
  const { field } = ctx
  switch (field.type) {
    case 'shortText':
      return <TextControl {...ctx} />
    case 'longText':
      return <TextAreaControl {...ctx} />
    case 'number':
      return <NumberControl {...ctx} />
    case 'date':
      return <DateControl {...ctx} />
    case 'select':
      return <SelectControl {...ctx} />
    case 'radio':
      return <RadioControl {...ctx} />
    case 'multiCheckbox':
      return <MultiCheckboxControl {...ctx} />
    case 'yesNo':
      return <YesNoControl {...ctx} />
    case 'file':
      return <FileControl {...ctx} />
    default:
      return null
  }
}

function TextControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
  return (
    <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
      <input
        id={field.id}
        type="text"
        value={value ?? ''}
        maxLength={field.maxLength || undefined}
        placeholder={field.placeholder || undefined}
        onChange={(e) => handle(e.target.value)}
        disabled={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="glass-input w-full px-3 py-2 text-sm disabled:opacity-60"
      />
    </FieldShell>
  )
}

function TextAreaControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
  return (
    <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
      <textarea
        id={field.id}
        rows={3}
        value={value ?? ''}
        maxLength={field.maxLength || undefined}
        placeholder={field.placeholder || undefined}
        onChange={(e) => handle(e.target.value)}
        disabled={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="glass-input w-full px-3 py-2 text-sm disabled:opacity-60"
      />
    </FieldShell>
  )
}

function NumberControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
  // Value stays a string in state; coercion happens at validate/submit, never
  // on keystroke (avoids Number('') === 0 corrupting an in-progress edit).
  return (
    <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
      <input
        id={field.id}
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        min={field.min ?? undefined}
        max={field.max ?? undefined}
        step={field.step ?? undefined}
        placeholder={field.placeholder || undefined}
        onChange={(e) => handle(e.target.value)}
        disabled={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="glass-input w-full px-3 py-2 text-sm disabled:opacity-60"
      />
    </FieldShell>
  )
}

function DateControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
  return (
    <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
      <input
        id={field.id}
        type="date"
        value={value ?? ''}
        onChange={(e) => handle(e.target.value)}
        disabled={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="glass-input w-full px-3 py-2 text-sm disabled:opacity-60"
      />
    </FieldShell>
  )
}

function SelectControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
  const options = field.options ?? []
  return (
    <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
      <select
        id={field.id}
        value={value ?? ''}
        onChange={(e) => handle(e.target.value)}
        disabled={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="glass-input w-full px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="" disabled>{field.placeholder || 'Choose…'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FieldShell>
  )
}

function RadioControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
  const options = field.options ?? []
  return (
    <FieldShell field={field} asFieldset error={error} errorId={errorId} helpId={helpId}>
      <div role="radiogroup" aria-describedby={describedBy} aria-invalid={error ? true : undefined} className="space-y-1.5">
        {options.map((opt) => {
          const optId = `${field.id}-${opt.value}`
          return (
            <label key={opt.value} htmlFor={optId} className="flex items-center gap-2.5 text-sm text-ink">
              <input
                id={optId}
                type="radio"
                name={field.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => handle(opt.value)}
                disabled={readOnly}
                className="h-4 w-4 accent-brand-600 disabled:opacity-60"
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </FieldShell>
  )
}

function MultiCheckboxControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
  const options = field.options ?? []
  const selected = Array.isArray(value) ? value : []
  const toggle = (optValue) => {
    const next = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue]
    handle(next)
  }
  return (
    <FieldShell field={field} asFieldset error={error} errorId={errorId} helpId={helpId}>
      <div aria-describedby={describedBy} className="space-y-1.5">
        {options.map((opt) => {
          const optId = `${field.id}-${opt.value}`
          return (
            <label key={opt.value} htmlFor={optId} className="flex items-center gap-2.5 text-sm text-ink">
              <input
                id={optId}
                type="checkbox"
                value={opt.value}
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                disabled={readOnly}
                className="h-4 w-4 rounded accent-brand-600 disabled:opacity-60"
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </FieldShell>
  )
}

function YesNoControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
  const current = value === true ? 'yes' : value === false ? 'no' : null
  const opts = [
    { key: 'yes', label: 'Yes', val: true },
    { key: 'no', label: 'No', val: false },
  ]
  return (
    <FieldShell field={field} asFieldset error={error} errorId={errorId} helpId={helpId}>
      <div role="radiogroup" aria-describedby={describedBy} aria-invalid={error ? true : undefined} className="inline-flex gap-1 rounded-xl bg-black/[0.04] p-1">
        {opts.map((o) => {
          const optId = `${field.id}-${o.key}`
          const active = current === o.key
          return (
            <label
              key={o.key}
              htmlFor={optId}
              className={[
                'cursor-pointer rounded-lg px-4 py-1.5 text-sm font-medium transition',
                active ? 'bg-brand-600 text-white' : 'text-muted hover:text-ink',
                readOnly ? 'cursor-default opacity-60' : '',
              ].join(' ')}
            >
              <input
                id={optId}
                type="radio"
                name={field.id}
                className="sr-only"
                checked={active}
                onChange={() => handle(o.val)}
                disabled={readOnly}
              />
              {o.label}
            </label>
          )
        })}
      </div>
    </FieldShell>
  )
}

function FileControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
  // In the wizard, value is File[] (re-linked to a descriptor at submit). In the
  // builder preview (readOnly), render a static stub — UploadZone has no disabled
  // mode and must not accept uploads during preview.
  if (readOnly) {
    return (
      <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
        <div
          id={field.id}
          aria-describedby={describedBy}
          className="rounded-xl border-2 border-dashed border-hairline-strong bg-glass-weak p-6 text-center text-sm text-muted"
        >
          File upload ({field.accept || 'any file'}{field.multiple ? ', multiple' : ''})
        </div>
      </FieldShell>
    )
  }
  const files = Array.isArray(value) ? value : []
  return (
    <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
      <UploadZone
        docType={`custom-field:${field.id}`}
        accept={field.accept || '.pdf,.png,.jpg,.jpeg'}
        multiple={field.multiple ?? false}
        files={files}
        onFilesChange={(next) => handle(next)}
      />
    </FieldShell>
  )
}
