import { describe, it, expect } from 'vitest'
import { FIELD_REGISTRY } from '../formSchema.js'

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
