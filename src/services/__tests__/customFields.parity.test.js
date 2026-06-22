import { describe, it, expect } from 'vitest'
import { diffWaiverType } from '../api.js'

describe('diffWaiverType', () => {
  it('reports name/description/active changes', () => {
    const before = { id: 'x', name: 'A', description: 'd1', active: true, requiredDocs: [], formSchema: [] }
    const after = { id: 'x', name: 'B', description: 'd1', active: false, requiredDocs: [], formSchema: [] }
    const diff = diffWaiverType(before, after)
    expect(diff).toContainEqual({ entity: 'Waiver: B', field: 'name', from: 'A', to: 'B' })
    expect(diff).toContainEqual({ entity: 'Waiver: B', field: 'active', from: true, to: false })
    expect(diff.find((d) => d.field === 'description')).toBeUndefined()
  })

  it('reports field count + requiredDocs changes without dumping arrays', () => {
    const before = { id: 'x', name: 'A', description: 'd', active: true, requiredDocs: ['courseList'], formSchema: [] }
    const after = { id: 'x', name: 'A', description: 'd', active: true, requiredDocs: ['courseList', 'supporting'], formSchema: [{ id: 'q1', type: 'shortText', label: 'Q' }] }
    const diff = diffWaiverType(before, after)
    expect(diff).toContainEqual({ entity: 'Waiver: A', field: 'fieldCount', from: 0, to: 1 })
    expect(diff).toContainEqual({ entity: 'Waiver: A', field: 'requiredDocs', from: 'courseList', to: 'courseList, supporting' })
  })

  it('returns empty diff for identical inputs', () => {
    const w = { id: 'x', name: 'A', description: 'd', active: true, requiredDocs: [], formSchema: [] }
    expect(diffWaiverType(w, { ...w })).toEqual([])
  })
})
