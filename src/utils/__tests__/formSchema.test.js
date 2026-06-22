import { describe, it, expect } from 'vitest'
import {
  FIELD_REGISTRY, makeUniqueId, slugifyWaiverId, createDefaultField,
  buildDefaults, validateForm, validateSchema,
} from '../formSchema.js'

describe('FIELD_REGISTRY', () => {
  const ALL_TYPES = [
    'shortText', 'longText', 'number', 'date', 'select', 'radio',
    'multiCheckbox', 'yesNo', 'file', 'sectionHeader', 'helpText',
  ]

  it('has an entry for all 11 field types and nothing else', () => {
    expect(Object.keys(FIELD_REGISTRY).sort()).toEqual([...ALL_TYPES].sort())
  })

  it('each entry carries type, label, isDisplayOnly, hasOptions, and an emptyValue function', () => {
    for (const type of ALL_TYPES) {
      const meta = FIELD_REGISTRY[type]
      expect(meta.type).toBe(type)
      expect(typeof meta.label).toBe('string')
      expect(meta.label.length).toBeGreaterThan(0)
      expect(typeof meta.isDisplayOnly).toBe('boolean')
      expect(typeof meta.hasOptions).toBe('boolean')
      expect(typeof meta.emptyValue).toBe('function')
    }
  })

  it('marks sectionHeader and helpText as the only display-only types', () => {
    const displayOnly = ALL_TYPES.filter((t) => FIELD_REGISTRY[t].isDisplayOnly)
    expect(displayOnly.sort()).toEqual(['helpText', 'sectionHeader'])
  })

  it('marks select, radio, and multiCheckbox as the only types with options', () => {
    const withOptions = ALL_TYPES.filter((t) => FIELD_REGISTRY[t].hasOptions)
    expect(withOptions.sort()).toEqual(['multiCheckbox', 'radio', 'select'])
  })

  it('emptyValue returns the correct empty per type', () => {
    expect(FIELD_REGISTRY.shortText.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.longText.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.number.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.date.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.select.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.radio.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.yesNo.emptyValue()).toBe(false)
    expect(FIELD_REGISTRY.multiCheckbox.emptyValue()).toEqual([])
  })

  it('emptyValue for multiCheckbox returns a fresh array each call (no shared reference)', () => {
    const a = FIELD_REGISTRY.multiCheckbox.emptyValue()
    const b = FIELD_REGISTRY.multiCheckbox.emptyValue()
    expect(a).not.toBe(b)
  })
})

describe('makeUniqueId', () => {
  it('slugifies a label to a lowercase dash-separated id with no prefix', () => {
    expect(makeUniqueId('Why are you requesting this?', [])).toBe('why-are-you-requesting-this')
  })

  it('collapses runs of non-alphanumerics and trims leading/trailing dashes', () => {
    expect(makeUniqueId('  Credits!!  earned  ', [])).toBe('credits-earned')
  })

  it('appends a numeric suffix starting at -2 on collision', () => {
    expect(makeUniqueId('Period', ['period'])).toBe('period-2')
  })

  it('keeps incrementing past existing suffixed ids', () => {
    expect(makeUniqueId('Period', ['period', 'period-2', 'period-3'])).toBe('period-4')
  })

  it('falls back to a deterministic "field" base when the slug is empty', () => {
    expect(makeUniqueId('!!!', [])).toBe('field')
    expect(makeUniqueId('', [])).toBe('field')
  })

  it('suffixes the fallback base on collision too', () => {
    expect(makeUniqueId('', ['field'])).toBe('field-2')
  })

  it('produces unique ids across a batch when threaded through an accumulator', () => {
    const taken = []
    const a = makeUniqueId('Reason', taken); taken.push(a)
    const b = makeUniqueId('Reason', taken); taken.push(b)
    const c = makeUniqueId('Reason', taken); taken.push(c)
    expect([a, b, c]).toEqual(['reason', 'reason-2', 'reason-3'])
  })
})

describe('slugifyWaiverId', () => {
  it('slugifies a waiver name to a lowercase dash-separated id', () => {
    expect(slugifyWaiverId('Medical Exemption', [])).toBe('medical-exemption')
  })

  it('appends a numeric suffix starting at -2 on collision', () => {
    expect(slugifyWaiverId('Medical Exemption', ['medical-exemption'])).toBe('medical-exemption-2')
  })

  it('falls back to a deterministic "waiver" base for an empty/symbol-only name', () => {
    expect(slugifyWaiverId('', [])).toBe('waiver')
    expect(slugifyWaiverId('###', [])).toBe('waiver')
  })

  it('suffixes the fallback base on collision', () => {
    expect(slugifyWaiverId('', ['waiver'])).toBe('waiver-2')
  })
})

describe('createDefaultField', () => {
  it('builds a shortText field with an id slugged from its default label', () => {
    const f = createDefaultField('shortText')
    expect(f.type).toBe('shortText')
    expect(f.label).toBe('Short text')
    expect(f.id).toBe('short-text')
    expect(f.required).toBe(false)
    expect(f.maxLength).toBeNull()
  })

  it('gives choice types a seeded options array with one option', () => {
    for (const type of ['select', 'radio', 'multiCheckbox']) {
      const f = createDefaultField(type)
      expect(Array.isArray(f.options)).toBe(true)
      expect(f.options.length).toBe(1)
      expect(f.options[0]).toHaveProperty('value')
      expect(f.options[0]).toHaveProperty('label')
    }
  })

  it('gives number fields null min/max/step', () => {
    const f = createDefaultField('number')
    expect(f.min).toBeNull()
    expect(f.max).toBeNull()
    expect(f.step).toBeNull()
  })

  it('gives file fields accept and multiple defaults', () => {
    const f = createDefaultField('file')
    expect(typeof f.accept).toBe('string')
    expect(f.multiple).toBe(false)
  })

  it('gives display-only types content and no required/answer semantics', () => {
    for (const type of ['sectionHeader', 'helpText']) {
      const f = createDefaultField(type)
      expect(f.type).toBe(type)
      expect(typeof f.content).toBe('string')
      expect(f).not.toHaveProperty('required')
      expect(f).not.toHaveProperty('options')
    }
  })

  it('does not put options on non-choice types', () => {
    expect(createDefaultField('shortText')).not.toHaveProperty('options')
    expect(createDefaultField('number')).not.toHaveProperty('options')
  })

  it('returns null for an unknown type', () => {
    expect(createDefaultField('bogus')).toBeNull()
  })
})

describe('buildDefaults', () => {
  it('T1: produces a per-type empty default for every input type', () => {
    const schema = [
      { id: 'a', type: 'shortText', label: 'A' },
      { id: 'b', type: 'longText', label: 'B' },
      { id: 'c', type: 'number', label: 'C' },
      { id: 'd', type: 'date', label: 'D' },
      { id: 'e', type: 'select', label: 'E', options: [{ value: 'x', label: 'X' }] },
      { id: 'f', type: 'radio', label: 'F', options: [{ value: 'x', label: 'X' }] },
      { id: 'g', type: 'multiCheckbox', label: 'G', options: [{ value: 'x', label: 'X' }] },
      { id: 'h', type: 'yesNo', label: 'H' },
    ]
    expect(buildDefaults(schema)).toEqual({
      a: '', b: '', c: '', d: '', e: '', f: '', g: [], h: false,
    })
  })

  it('T2: display-only types (sectionHeader, helpText) produce no key', () => {
    const schema = [
      { id: 'intro', type: 'sectionHeader', label: 'Intro', content: 'Welcome' },
      { id: 'note', type: 'helpText', label: 'Note', content: 'Read carefully' },
      { id: 'name', type: 'shortText', label: 'Name' },
    ]
    const defaults = buildDefaults(schema)
    expect(defaults).toEqual({ name: '' })
    expect(defaults).not.toHaveProperty('intro')
    expect(defaults).not.toHaveProperty('note')
  })

  it('T3: an empty schema yields an empty object', () => {
    expect(buildDefaults([])).toEqual({})
  })

  it('returns a fresh array for each multiCheckbox field (no shared reference)', () => {
    const schema = [
      { id: 'm1', type: 'multiCheckbox', label: 'M1', options: [{ value: 'x', label: 'X' }] },
      { id: 'm2', type: 'multiCheckbox', label: 'M2', options: [{ value: 'x', label: 'X' }] },
    ]
    const defaults = buildDefaults(schema)
    expect(defaults.m1).not.toBe(defaults.m2)
  })

  it('skips fields with an unknown type (no key, no throw)', () => {
    const schema = [
      { id: 'ok', type: 'shortText', label: 'OK' },
      { id: 'weird', type: 'bogus', label: 'Weird' },
    ]
    expect(buildDefaults(schema)).toEqual({ ok: '' })
  })

  it('tolerates a null/undefined schema', () => {
    expect(buildDefaults(null)).toEqual({})
    expect(buildDefaults(undefined)).toEqual({})
  })
})

describe('validateForm', () => {
  // T4 — required-empty gate
  it('T4: flags a required field that is empty', () => {
    const fields = [{ id: 'name', type: 'shortText', label: 'Name', required: true }]
    const errors = validateForm(fields, { name: '' })
    expect(errors.name).toBe('This field is required.')
  })

  it('T4b: leaves an optional empty field alone', () => {
    const fields = [{ id: 'note', type: 'shortText', label: 'Note', required: false }]
    expect(validateForm(fields, { note: '' })).toEqual({})
  })

  // T5 — falsy-but-answered values (yesNo:false, number:0, multiCheckbox:['a'])
  it('T5: yesNo false counts as answered (not empty)', () => {
    const fields = [{ id: 'ok', type: 'yesNo', label: 'OK', required: true }]
    expect(validateForm(fields, { ok: false })).toEqual({})
  })

  it('T5b: number 0 counts as answered', () => {
    const fields = [{ id: 'qty', type: 'number', label: 'Qty', required: true }]
    expect(validateForm(fields, { qty: 0 })).toEqual({})
  })

  it('T5c: non-empty multiCheckbox counts as answered', () => {
    const fields = [
      { id: 'ch', type: 'multiCheckbox', label: 'Ch', required: true,
        options: [{ value: 'a', label: 'A' }] },
    ]
    expect(validateForm(fields, { ch: ['a'] })).toEqual({})
  })

  it('T5d: empty multiCheckbox array is unanswered when required', () => {
    const fields = [
      { id: 'ch', type: 'multiCheckbox', label: 'Ch', required: true,
        options: [{ value: 'a', label: 'A' }] },
    ]
    expect(validateForm(fields, { ch: [] }).ch).toBe('This field is required.')
  })

  // T6 — number range / NaN
  it('T6: NaN string gives number error', () => {
    const fields = [{ id: 'n', type: 'number', label: 'N', required: false }]
    expect(validateForm(fields, { n: 'abc' }).n).toBeTruthy()
  })

  it('T6b: below min gives error', () => {
    const fields = [{ id: 'n', type: 'number', label: 'N', required: false, min: 5, max: null }]
    expect(validateForm(fields, { n: 3 }).n).toBeTruthy()
  })

  it('T6c: above max gives error', () => {
    const fields = [{ id: 'n', type: 'number', label: 'N', required: false, min: null, max: 10 }]
    expect(validateForm(fields, { n: 20 }).n).toBeTruthy()
  })

  it('T6d: empty optional number has no error', () => {
    const fields = [{ id: 'n', type: 'number', label: 'N', required: false }]
    expect(validateForm(fields, { n: '' })).toEqual({})
  })

  // T7 — maxLength
  it('T7: exceeding maxLength gives error', () => {
    const fields = [{ id: 't', type: 'shortText', label: 'T', required: false, maxLength: 5 }]
    expect(validateForm(fields, { t: 'toolong' }).t).toBeTruthy()
  })

  it('T7b: within maxLength is fine', () => {
    const fields = [{ id: 't', type: 'shortText', label: 'T', required: false, maxLength: 10 }]
    expect(validateForm(fields, { t: 'hi' })).toEqual({})
  })

  // T8 — orphan option
  it('T8: select with orphan value gives "Choose a valid option."', () => {
    const fields = [
      { id: 's', type: 'select', label: 'S', required: false,
        options: [{ value: 'a', label: 'A' }] },
    ]
    expect(validateForm(fields, { s: 'z' }).s).toBe('Choose a valid option.')
  })

  it('T8b: select with valid option passes', () => {
    const fields = [
      { id: 's', type: 'select', label: 'S', required: false,
        options: [{ value: 'a', label: 'A' }] },
    ]
    expect(validateForm(fields, { s: 'a' })).toEqual({})
  })

  it('T8c: multiCheckbox containing orphan gives error', () => {
    const fields = [
      { id: 'mc', type: 'multiCheckbox', label: 'MC', required: false,
        options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    ]
    expect(validateForm(fields, { mc: ['a', 'z'] }).mc).toBe('Choose a valid option.')
  })

  // T9 — display-only types skipped
  it('T9: sectionHeader and helpText skipped even when required:true', () => {
    const fields = [
      { id: 'h1', type: 'sectionHeader', label: 'H', required: true, content: '' },
      { id: 'ht', type: 'helpText', label: 'H', required: true, content: '' },
    ]
    expect(validateForm(fields, {})).toEqual({})
  })

  it('empty field list returns empty object', () => {
    expect(validateForm([], {})).toEqual({})
  })
})

describe('validateSchema', () => {
  it('well-formed schema returns { ok: true, errors: {}, formError: null }', () => {
    const fields = [
      { id: 'n', type: 'shortText', label: 'Name' },
      { id: 's', type: 'select', label: 'Grade',
        options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    ]
    expect(validateSchema(fields)).toEqual({ ok: true, errors: {}, formError: null })
  })

  // T10 — duplicate ids → formError (not errors, because id-keyed map collapses dups)
  it('T10: duplicate ids produce a truthy formError and ok:false', () => {
    const fields = [
      { id: 'x', type: 'shortText', label: 'A' },
      { id: 'x', type: 'shortText', label: 'B' },
    ]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.formError).toBeTruthy()
    expect(res.formError.toLowerCase()).toContain('dup')
  })

  // T11 — choice with no options
  it('T11: choice field with no options errors', () => {
    const fields = [
      { id: 's', type: 'select', label: 'Grade', options: [] },
    ]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.errors.s).toBeTruthy()
  })

  it('T11b: options with blank labels error', () => {
    const fields = [
      { id: 's', type: 'select', label: 'Grade',
        options: [{ value: 'a', label: '' }] },
    ]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.errors.s).toBeTruthy()
  })

  // T12 — unknown type
  it('T12: unknown type produces an error', () => {
    const fields = [{ id: 'x', type: 'bogus', label: 'Whatever' }]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.errors.x).toBeTruthy()
  })

  it('blank label produces an error', () => {
    const fields = [{ id: 'n', type: 'shortText', label: '' }]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.errors.n).toBeTruthy()
  })

  it('number min > max produces an error', () => {
    const fields = [{ id: 'n', type: 'number', label: 'Score', min: 10, max: 5 }]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.errors.n).toBeTruthy()
  })

  it('number min <= max is valid', () => {
    const fields = [{ id: 'n', type: 'number', label: 'Score', min: 0, max: 100 }]
    expect(validateSchema(fields)).toEqual({ ok: true, errors: {}, formError: null })
  })

  it('empty schema returns { ok: true, errors: {}, formError: null }', () => {
    expect(validateSchema([])).toEqual({ ok: true, errors: {}, formError: null })
  })
})
