// FNV-1a string hash used to fingerprint a waiver request so duplicate
// in-flight submissions (same student, same waiver type, same course swap)
// can be rejected without a real database unique-constraint.

export function fnv1aHash(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

export function hashRequestKey({ studentId, waiverTypeId, fromCourse, toCourse }) {
  const key = [studentId ?? '', waiverTypeId ?? '', fromCourse ?? '', toCourse ?? ''].join('|').toLowerCase()
  return fnv1aHash(key)
}

export function isDuplicateRequest(hash, existingHashes) {
  return existingHashes.has(hash)
}
