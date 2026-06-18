// Token-bucket rate limiter — caps waiver submissions per student, refilling
// gradually rather than as a hard reset window (so it can't be gamed at the boundary).
const DEFAULT_CAPACITY = 5
const DEFAULT_REFILL_MS = 60 * 60 * 1000 // bucket fully refills over an hour

class TokenBucket {
  constructor(capacity, refillMs) {
    this.capacity = capacity
    this.refillMs = refillMs
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  tryConsume(cost = 1) {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + (elapsed / this.refillMs) * this.capacity)
      this.lastRefill = now
    }
    if (this.tokens < cost) return false
    this.tokens -= cost
    return true
  }
}

const buckets = new Map() // studentId -> TokenBucket

export function canSubmit(studentId, capacity = DEFAULT_CAPACITY, refillMs = DEFAULT_REFILL_MS) {
  if (!buckets.has(studentId)) buckets.set(studentId, new TokenBucket(capacity, refillMs))
  return buckets.get(studentId).tryConsume(1)
}

export function resetRateLimiter() {
  buckets.clear()
}
