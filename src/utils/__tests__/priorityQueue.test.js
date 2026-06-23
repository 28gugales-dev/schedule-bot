import { describe, it, expect } from 'vitest'
import { MinHeap, priorityOrderQueue } from '../priorityQueue.js'

// NOTE: IndexedPriorityQueue is already covered in algorithms.test.js; this file
// targets the untested MinHeap and the priorityOrderQueue ordering logic.

describe('MinHeap', () => {
  it('pops values in ascending priority order', () => {
    const heap = new MinHeap()
    heap.push('mid', 5)
    heap.push('low', 1)
    heap.push('high', 9)
    heap.push('lower', 0)
    expect([heap.pop(), heap.pop(), heap.pop(), heap.pop()]).toEqual(['lower', 'low', 'mid', 'high'])
  })

  it('returns undefined when popping an empty heap', () => {
    const heap = new MinHeap()
    expect(heap.pop()).toBeUndefined()
    expect(heap.size).toBe(0)
  })

  it('tracks size as items are pushed and popped', () => {
    const heap = new MinHeap()
    expect(heap.size).toBe(0)
    heap.push('a', 2)
    heap.push('b', 1)
    expect(heap.size).toBe(2)
    heap.pop()
    expect(heap.size).toBe(1)
  })

  it('toSortedArray is non-destructive (heap is unchanged afterwards)', () => {
    const heap = new MinHeap()
    heap.push('a', 3)
    heap.push('b', 1)
    heap.push('c', 2)
    const sorted = heap.toSortedArray()
    expect(sorted).toEqual(['b', 'c', 'a'])
    // Original heap still holds all three items and still pops the min first.
    expect(heap.size).toBe(3)
    expect(heap.pop()).toBe('b')
  })

  it('handles negative and duplicate priorities', () => {
    const heap = new MinHeap()
    heap.push('x', -2)
    heap.push('y', -2)
    heap.push('z', -5)
    expect(heap.pop()).toBe('z')
    // The two equal-priority items both come out before nothing else remains.
    const rest = [heap.pop(), heap.pop()]
    expect(rest).toContain('x')
    expect(rest).toContain('y')
  })
})

describe('priorityOrderQueue', () => {
  const now = Date.now()
  const daysAgo = (n) => new Date(now - n * 86_400_000).toISOString()

  it('orders seniors ahead of underclassmen (grade weight dominates)', () => {
    // gradeWeight*10 dominates ageDays, so a senior submitted today still beats a
    // freshman submitted today.
    const requests = [
      { id: 'freshman', student: { grade: 9 }, submittedAt: daysAgo(0) },
      { id: 'senior', student: { grade: 12 }, submittedAt: daysAgo(0) },
      { id: 'junior', student: { grade: 11 }, submittedAt: daysAgo(0) },
    ]
    const ordered = priorityOrderQueue(requests)
    expect(ordered.map((r) => r.id)).toEqual(['senior', 'junior', 'freshman'])
  })

  it('breaks ties within the same grade by age (older submissions first)', () => {
    const requests = [
      { id: 'recent', student: { grade: 11 }, submittedAt: daysAgo(1) },
      { id: 'old', student: { grade: 11 }, submittedAt: daysAgo(20) },
    ]
    const ordered = priorityOrderQueue(requests)
    expect(ordered.map((r) => r.id)).toEqual(['old', 'recent'])
  })

  it('defaults a missing student/grade to grade 9 (least urgent)', () => {
    const requests = [
      { id: 'no-student', submittedAt: daysAgo(0) }, // grade defaults to 9
      { id: 'senior', student: { grade: 12 }, submittedAt: daysAgo(0) },
    ]
    const ordered = priorityOrderQueue(requests)
    expect(ordered.map((r) => r.id)).toEqual(['senior', 'no-student'])
  })

  it('returns an empty array for no requests', () => {
    expect(priorityOrderQueue([])).toEqual([])
  })

  it('does not lose entries when submittedAt is malformed (NaN score)', () => {
    // SUSPECTED BUG: an invalid submittedAt yields new Date(...).getTime() === NaN,
    // so the priority score is NaN. All NaN heap comparisons are false, so the
    // entry never bubbles and its position is undefined. We only assert that no
    // entry is dropped (count is preserved) and document the unspecified order.
    const requests = [
      { id: 'good', student: { grade: 12 }, submittedAt: daysAgo(0) },
      { id: 'bad', student: { grade: 11 }, submittedAt: 'not-a-date' },
    ]
    const ordered = priorityOrderQueue(requests)
    expect(ordered).toHaveLength(2)
    expect(ordered.map((r) => r.id).sort()).toEqual(['bad', 'good'])
  })
})
