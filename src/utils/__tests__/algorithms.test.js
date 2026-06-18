import { describe, it, expect, beforeEach } from 'vitest'
import { analyzeDropImpact } from '../dependencyAnalysis.js'
import { getEquivalents, areEquivalent } from '../equivalencyGraph.js'
import { freezeRuleVersion, computeRuleVersionId } from '../ruleVersion.js'
import { canSubmit, resetRateLimiter } from '../rateLimiter.js'
import { buildSyncPackage } from '../batchProcessor.js'
import { IndexedPriorityQueue } from '../priorityQueue.js'
import { explainEligibility } from '../explanationEngine.js'

describe('dependencyAnalysis', () => {
  it('flags every downstream course blocked by dropping a prerequisite', () => {
    const impact = analyzeDropImpact('Chemistry Honors')
    expect(impact.impacted).toContain('AP Chemistry')
    expect(impact.warning).toMatch(/Chemistry Honors/)
  })

  it('reports no impact for a terminal course', () => {
    const impact = analyzeDropImpact('AP Research')
    expect(impact.impacted).toEqual([])
    expect(impact.warning).toBeNull()
  })
})

describe('equivalencyGraph', () => {
  it('clusters AP/Honors/base variants of the same subject', () => {
    expect(areEquivalent('AP Biology', 'Biology Honors')).toBe(true)
    expect(getEquivalents('AP Biology').length).toBeGreaterThan(0)
  })

  it('does not conflate distinct subjects sharing qualifier words', () => {
    expect(areEquivalent('Algebra: Concepts & Connections', 'Geometry: Concept & Connections')).toBe(false)
  })
})

describe('ruleVersion', () => {
  const criteria = [{ id: 'min-gpa', value: 2.5, enabled: true }]
  it('is deterministic for identical rubric content', () => {
    expect(computeRuleVersionId(criteria)).toBe(computeRuleVersionId(criteria.map((c) => ({ ...c }))))
  })

  it('changes when the rubric changes', () => {
    const v1 = computeRuleVersionId(criteria)
    const v2 = computeRuleVersionId([{ ...criteria[0], value: 3.0 }])
    expect(v1).not.toBe(v2)
  })

  it('produces an immutable snapshot', () => {
    const frozen = freezeRuleVersion(criteria)
    expect(() => { frozen.year = 1999 }).toThrow()
  })
})

describe('rateLimiter', () => {
  beforeEach(() => resetRateLimiter())

  it('allows up to capacity submissions then blocks', () => {
    for (let i = 0; i < 5; i++) expect(canSubmit('student-a', 5, 60_000)).toBe(true)
    expect(canSubmit('student-a', 5, 60_000)).toBe(false)
  })

  it('tracks students independently', () => {
    for (let i = 0; i < 5; i++) canSubmit('student-b', 5, 60_000)
    expect(canSubmit('student-c', 5, 60_000)).toBe(true)
  })
})

describe('batchProcessor', () => {
  it('groups approved waivers by type via map-reduce', () => {
    const pkg = buildSyncPackage([
      { id: 'r1', student: 'A', waiver: 'Prerequisite Override', approvedAt: '2026-01-01' },
      { id: 'r2', student: 'B', waiver: 'Prerequisite Override', approvedAt: '2026-01-02' },
      { id: 'r3', student: 'C', waiver: 'Late Add/Drop', approvedAt: '2026-01-03' },
    ])
    expect(pkg.totalCount).toBe(3)
    expect(pkg.byWaiverType['Prerequisite Override']).toBe(2)
    expect(pkg.byWaiverType['Late Add/Drop']).toBe(1)
  })
})

describe('IndexedPriorityQueue', () => {
  it('pops in priority order', () => {
    const q = new IndexedPriorityQueue()
    q.push('a', 'A', 5)
    q.push('b', 'B', 1)
    q.push('c', 'C', 3)
    expect([q.pop(), q.pop(), q.pop()]).toEqual(['B', 'C', 'A'])
  })

  it('supports O(log n) priority updates and removal by id', () => {
    const q = new IndexedPriorityQueue()
    q.push('a', 'A', 5)
    q.push('b', 'B', 1)
    q.updatePriority('a', 0)
    expect(q.pop()).toBe('A')
    expect(q.remove('b')).toBe('B')
    expect(q.size).toBe(0)
  })
})

describe('explanationEngine', () => {
  it('explains both passed and failed rules with actual values', () => {
    const course = { name: 'AP Chemistry', minGrade: 11, prerequisite: 'Chemistry Honors' }
    const student = { currentGrade: 10, completed: new Set(['Chemistry Honors']) }
    const { eligible, reasons } = explainEligibility(student, course)
    expect(eligible).toBe(false)
    expect(reasons.find((r) => r.id === 'prereq').passed).toBe(true)
    expect(reasons.find((r) => r.id === 'grade').text).toMatch(/below the requirement/)
  })
})
