import { describe, it, expect } from 'vitest'
import { FIELD_REGISTRY, makeUniqueId, slugifyWaiverId, createDefaultField } from '../formSchema.js'

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
