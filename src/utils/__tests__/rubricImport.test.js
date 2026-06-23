import { describe, it, expect } from 'vitest'
import { parseRubricImport, REQUIRED_DOC_IDS } from '../rubricImport.js'

describe('parseRubricImport — JSON', () => {
  it('parses a bare array of criteria', () => {
    const text = JSON.stringify([
      { label: 'Minimum GPA', type: 'number', value: 3.0 },
      { label: 'Counselor signed', type: 'boolean', value: true },
    ])
    const r = parseRubricImport(text, 'rules.json')
    expect(r.ok).toBe(true)
    expect(r.criteria).toHaveLength(2)
    expect(r.criteria[0]).toMatchObject({ label: 'Minimum GPA', type: 'number', value: 3.0, enabled: true })
    expect(r.criteria[1]).toMatchObject({ label: 'Counselor signed', type: 'boolean', value: true })
    expect(r.requiredDocs).toEqual([])
  })

  it('parses an object with criteria + requiredDocs', () => {
    const text = JSON.stringify({
      criteria: [{ label: 'Min credits', type: 'number', value: 10 }],
      requiredDocs: ['courseList', 'transcript'],
    })
    const r = parseRubricImport(text)
    expect(r.ok).toBe(true)
    expect(r.criteria).toHaveLength(1)
    expect(r.requiredDocs).toEqual(['courseList', 'transcript'])
  })

  it('normalises doc aliases and drops unknown docs (counting them skipped)', () => {
    const text = JSON.stringify({
      criteria: [],
      requiredDocs: ['Course List', 'grades', 'mystery-doc'],
    })
    const r = parseRubricImport(text)
    expect(r.requiredDocs).toEqual(['courseList', 'transcript'])
    expect(r.skipped).toBe(1)
  })

  it('assigns unique ids when labels collide', () => {
    const text = JSON.stringify([
      { label: 'GPA', type: 'number', value: 2 },
      { label: 'GPA', type: 'number', value: 3 },
    ])
    const r = parseRubricImport(text)
    const ids = r.criteria.map((c) => c.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('accepts threshold as a value alias and defaults enabled to true', () => {
    const text = JSON.stringify([{ name: 'Min GPA', type: 'number', threshold: 3.5 }])
    const r = parseRubricImport(text)
    expect(r.criteria[0]).toMatchObject({ label: 'Min GPA', value: 3.5, enabled: true })
  })

  it('returns an error for malformed JSON', () => {
    const r = parseRubricImport('{ not json', 'x.json')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/not valid JSON/i)
  })
})

describe('parseRubricImport — CSV', () => {
  it('parses a headered CSV with rules and a doc row', () => {
    const csv = [
      'label,type,value,enabled',
      'Minimum GPA,number,3.0,true',
      'Parent consent,boolean,yes,true',
      'Course list,doc,courseList,',
    ].join('\n')
    const r = parseRubricImport(csv, 'rubric.csv')
    expect(r.ok).toBe(true)
    expect(r.criteria).toHaveLength(2)
    expect(r.criteria[0]).toMatchObject({ label: 'Minimum GPA', type: 'number', value: 3.0 })
    expect(r.criteria[1]).toMatchObject({ label: 'Parent consent', type: 'boolean', value: true })
    expect(r.requiredDocs).toEqual(['courseList'])
  })

  it('treats type-less rows as numeric thresholds (positional, no header)', () => {
    const csv = 'Min GPA,,2.5\nMax absences,,5'
    const r = parseRubricImport(csv, 'plain.csv')
    expect(r.criteria).toHaveLength(2)
    expect(r.criteria[0]).toMatchObject({ label: 'Min GPA', type: 'number', value: 2.5 })
  })

  it('handles quoted fields containing commas', () => {
    const csv = 'label,type,value\n"GPA, weighted",number,3.2'
    const r = parseRubricImport(csv, 'q.csv')
    expect(r.criteria[0].label).toBe('GPA, weighted')
    expect(r.criteria[0].value).toBe(3.2)
  })

  it('skips rows with an unrecognised explicit type', () => {
    const csv = 'label,type,value\nWeird,banana,1\nOk,number,2'
    const r = parseRubricImport(csv)
    expect(r.criteria).toHaveLength(1)
    expect(r.skipped).toBe(1)
  })

  it('tolerates Windows CRLF line endings', () => {
    const csv = 'label,type,value\r\nMin GPA,number,3\r\n'
    const r = parseRubricImport(csv, 'crlf.csv')
    expect(r.criteria).toHaveLength(1)
  })
})

describe('parseRubricImport — guards', () => {
  it('rejects empty input', () => {
    expect(parseRubricImport('', 'x.csv').ok).toBe(false)
    expect(parseRubricImport('   ').ok).toBe(false)
  })

  it('rejects a file with no rules or docs', () => {
    const r = parseRubricImport(JSON.stringify({ criteria: [], requiredDocs: [] }))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/no rules/i)
  })

  it('exposes the canonical doc id set', () => {
    expect(REQUIRED_DOC_IDS).toEqual(['courseList', 'transcript', 'supporting'])
  })
})
