// Immutable rule-set snapshot stamped onto each submission so a later rubric
// edit doesn't retroactively change the rules a student was already judged
// against. versionId is a content hash, so the same rubric always reproduces
// the same id and only changes when the rules actually change.
import { fnv1aHash } from './dedupeHash.js'

export function computeRuleVersionId(criteria) {
  const key = criteria.map((c) => `${c.id}:${c.value}:${c.enabled}`).sort().join('|')
  return fnv1aHash(key)
}

export function freezeRuleVersion(criteria) {
  const year = new Date().getFullYear()
  const versionId = computeRuleVersionId(criteria)
  return Object.freeze({
    year,
    versionId,
    label: `graduation_${year}_${versionId}`,
    frozenAt: new Date().toISOString(),
    criteria: Object.freeze(criteria.map((c) => Object.freeze({ ...c }))),
  })
}
