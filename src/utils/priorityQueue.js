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

// Like MinHeap, but tracks id -> heap-index so a single entry's priority can
// be updated or removed in O(log n) without rebuilding the whole heap.
export class IndexedPriorityQueue {
  constructor() {
    this._items = [] // [{ id, value, priority }]
    this._index = new Map()
  }

  get size() {
    return this._items.length
  }

  push(id, value, priority) {
    if (this._index.has(id)) return this.updatePriority(id, priority)
    this._items.push({ id, value, priority })
    this._index.set(id, this._items.length - 1)
    this._bubbleUp(this._items.length - 1)
  }

  updatePriority(id, priority) {
    const i = this._index.get(id)
    if (i === undefined) return
    const old = this._items[i].priority
    this._items[i].priority = priority
    if (priority < old) this._bubbleUp(i)
    else this._bubbleDown(i)
  }

  remove(id) {
    const i = this._index.get(id)
    if (i === undefined) return undefined
    const removed = this._items[i]
    const last = this._items.pop()
    this._index.delete(id)
    if (i < this._items.length) {
      this._items[i] = last
      this._index.set(last.id, i)
      this._bubbleDown(i)
      this._bubbleUp(i)
    }
    return removed.value
  }

  pop() {
    return this._items.length ? this.remove(this._items[0].id) : undefined
  }

  peek() {
    return this._items[0]?.value
  }

  toSortedArray() {
    const snapshot = new IndexedPriorityQueue()
    for (const item of this._items) snapshot.push(item.id, item.value, item.priority)
    const out = []
    while (snapshot.size > 0) out.push(snapshot.pop())
    return out
  }

  _bubbleUp(index) {
    let i = index
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this._items[parent].priority <= this._items[i].priority) break
      this._swap(parent, i)
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
      this._swap(smallest, i)
      i = smallest
    }
  }

  _swap(a, b) {
    ;[this._items[a], this._items[b]] = [this._items[b], this._items[a]]
    this._index.set(this._items[a].id, a)
    this._index.set(this._items[b].id, b)
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
