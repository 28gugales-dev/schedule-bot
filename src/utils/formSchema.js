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
