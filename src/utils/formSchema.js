// Pure form-schema engine. The shared contract module imported by the form
// builder, the student wizard renderer, the gateway, and the review screen.
// No DOM, no React, no side effects — everything here is unit-testable.

// Per-type metadata. emptyValue is a factory (not a constant) so callers always
// get a fresh value — critical for multiCheckbox so fields never share one array.
// emptyValue for file is not built into the answer map by buildDefaults (files
// live in component File[] state and become descriptors at submit), so it returns
// null here purely as a defined fallback. Display-only types never get an answer
// key, so their emptyValue is never read.
export const FIELD_REGISTRY = {
  shortText:     { type: 'shortText',     label: 'Short text',     isDisplayOnly: false, hasOptions: false, emptyValue: () => '' },
  longText:      { type: 'longText',      label: 'Long text',      isDisplayOnly: false, hasOptions: false, emptyValue: () => '' },
  number:        { type: 'number',        label: 'Number',         isDisplayOnly: false, hasOptions: false, emptyValue: () => '' },
  date:          { type: 'date',          label: 'Date',           isDisplayOnly: false, hasOptions: false, emptyValue: () => '' },
  select:        { type: 'select',        label: 'Dropdown',       isDisplayOnly: false, hasOptions: true,  emptyValue: () => '' },
  radio:         { type: 'radio',         label: 'Single choice',  isDisplayOnly: false, hasOptions: true,  emptyValue: () => '' },
  multiCheckbox: { type: 'multiCheckbox', label: 'Multiple choice', isDisplayOnly: false, hasOptions: true,  emptyValue: () => [] },
  yesNo:         { type: 'yesNo',         label: 'Yes / No',       isDisplayOnly: false, hasOptions: false, emptyValue: () => false },
  file:          { type: 'file',          label: 'File upload',    isDisplayOnly: false, hasOptions: false, emptyValue: () => null },
  sectionHeader: { type: 'sectionHeader', label: 'Section header', isDisplayOnly: true,  hasOptions: false, emptyValue: () => undefined },
  helpText:      { type: 'helpText',      label: 'Help text',      isDisplayOnly: true,  hasOptions: false, emptyValue: () => undefined },
}

// Lowercase, dash-separated slug. Collapses non-alphanumerics, trims edge dashes.
function slugify(label) {
  return String(label || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Stable, collision-free field id from a label slug. Ported from RubricBuilder's
// makeUniqueId but WITHOUT the `crit-` prefix (field ids are bare slugs), taking
// an ARRAY of existing ids, and with a deterministic 'field' fallback (RubricBuilder
// used Date.now(), which is non-deterministic and untestable). Collision numbering
// starts at -2, matching RubricBuilder.
export function makeUniqueId(label, existingIds = []) {
  const taken = new Set(existingIds)
  const base = slugify(label) || 'field'
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

// Waiver-type id (the TEXT primary key). Same slug+collision idiom as
// makeUniqueId, seeded from the waiver NAME, with a 'waiver' fallback.
export function slugifyWaiverId(name, existingIds = []) {
  const taken = new Set(existingIds)
  const base = slugify(name) || 'waiver'
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

// Factory for a fresh field definition with type-appropriate defaults. Single arg
// by contract: the FormBuilder handles uniqueness on append, so the id is slugged
// from the label against an empty list here. Type-specific keys are present ONLY
// when meaningful for that type (matches the spec's field-definition object).
export function createDefaultField(type) {
  const meta = FIELD_REGISTRY[type]
  if (!meta) return null

  // Display-only types: no required/options/answer keys — just body copy.
  if (meta.isDisplayOnly) {
    return {
      id: makeUniqueId(meta.label, []),
      type,
      label: meta.label,
      content: '',
    }
  }

  const field = {
    id: makeUniqueId(meta.label, []),
    type,
    label: meta.label,
    required: false,
    helpText: '',
  }

  if (meta.hasOptions) {
    field.options = [{ value: 'option-1', label: 'Option 1' }]
  }
  if (type === 'shortText' || type === 'longText') {
    field.placeholder = ''
    field.maxLength = null
  }
  if (type === 'number') {
    field.placeholder = ''
    field.min = null
    field.max = null
    field.step = null
  }
  if (type === 'file') {
    field.accept = '.pdf,.png,.jpg,.jpeg'
    field.multiple = false
  }

  return field
}

// Build the initial answer map for a schema. Skips display-only fields (they have
// no answer key) and unknown types. Each value comes from the registry's emptyValue
// factory, so multiCheckbox fields get their own fresh array (never a shared one).
export function buildDefaults(schema) {
  const out = {}
  if (!Array.isArray(schema)) return out
  for (const field of schema) {
    const meta = FIELD_REGISTRY[field?.type]
    if (!meta || meta.isDisplayOnly) continue
    out[field.id] = meta.emptyValue()
  }
  return out
}

function isEmpty(v) {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0)
}

export function validateForm(fields, answers = {}) {
  const errors = {}
  if (!Array.isArray(fields)) return errors
  for (const field of fields) {
    const meta = FIELD_REGISTRY[field?.type]
    if (!meta || meta.isDisplayOnly) continue
    const value = answers[field.id]
    if (field.required && isEmpty(value)) {
      errors[field.id] = 'This field is required.'
      continue
    }
    if (isEmpty(value)) continue
    if (field.type === 'number') {
      const n = typeof value === 'number' ? value : Number(value)
      if (Number.isNaN(n)) {
        errors[field.id] = 'Enter a valid number.'
      } else if (field.min != null && n < field.min) {
        errors[field.id] = `Must be at least ${field.min}.`
      } else if (field.max != null && n > field.max) {
        errors[field.id] = `Must be at most ${field.max}.`
      }
      continue
    }
    if (field.type === 'date') {
      if (Number.isNaN(new Date(value).getTime())) {
        errors[field.id] = 'Enter a valid date.'
      }
      continue
    }
    if (field.type === 'shortText' || field.type === 'longText') {
      if (field.maxLength != null && String(value).length > field.maxLength) {
        errors[field.id] = `Must be ${field.maxLength} characters or fewer.`
      }
      continue
    }
    if (meta.hasOptions) {
      const valid = new Set((field.options ?? []).map((o) => o.value))
      const selected = Array.isArray(value) ? value : [value]
      if (selected.some((v) => !valid.has(v))) {
        errors[field.id] = 'Choose a valid option.'
      }
      continue
    }
  }
  return errors
}
