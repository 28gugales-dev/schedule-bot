// Binary-heap priority queue (min-heap: lower priority = higher urgency, popped first).
export class MinHeap {
  constructor() {
    this._items = [] // [{ priority, value }]
  }

  get size() {
    return this._items.length
  }

  push(value, priority) {
    this._items.push({ value, priority })
    this._bubbleUp(this._items.length - 1)
  }

  pop() {
    if (this._items.length === 0) return undefined
    const top = this._items[0]
    const last = this._items.pop()
    if (this._items.length > 0) {
      this._items[0] = last
      this._bubbleDown(0)
    }
    return top.value
  }

  toSortedArray() {
    const clone = new MinHeap()
    clone._items = this._items.map((i) => ({ ...i }))
    const out = []
    while (clone.size > 0) out.push(clone.pop())
    return out
  }

  _bubbleUp(index) {
    let i = index
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this._items[parent].priority <= this._items[i].priority) break
      ;[this._items[parent], this._items[i]] = [this._items[i], this._items[parent]]
      i = parent
    }
  }

  _bubbleDown(index) {
    let i = index
    const n = this._items.length
    while (true) {
      const left = i * 2 + 1
      const right = i * 2 + 2
      let smallest = i
      if (left < n && this._items[left].priority < this._items[smallest].priority) smallest = left
      if (right < n && this._items[right].priority < this._items[smallest].priority) smallest = right
      if (smallest === i) break
      ;[this._items[smallest], this._items[i]] = [this._items[i], this._items[smallest]]
      i = smallest
    }
  }
}

// Sorts review-queue requests by urgency (seniors + older submissions first).
export function priorityOrderQueue(requests) {
  const heap = new MinHeap()
  const now = Date.now()
  for (const request of requests) {
    const gradeWeight = 12 - (request.student?.grade ?? 9) // senior -> 0 (most urgent)
    const ageDays = (now - new Date(request.submittedAt).getTime()) / 86_400_000
    const score = gradeWeight * 10 - ageDays
    heap.push(request, score)
  }
  return heap.toSortedArray()
}
