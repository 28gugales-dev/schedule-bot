// Generic map-reduce over a batch — scales eligibility/sync work past a
// handful of records (semester rollover, mass schedule updates).
export function mapReduce(items, mapFn, reduceFn, initial) {
  return items.map(mapFn).reduce(reduceFn, initial)
}

// Map: each approved waiver -> a normalized Infinite Campus sync record.
// Reduce: group into one package (counts + grouped by waiver type).
export function buildSyncPackage(approvedWaivers) {
  const toRecord = (w) => ({ requestId: w.id, student: w.student, waiverType: w.waiver, approvedAt: w.approvedAt })
  const intoPackage = (pkg, record) => {
    pkg.totalCount += 1
    pkg.byWaiverType[record.waiverType] = (pkg.byWaiverType[record.waiverType] ?? 0) + 1
    pkg.records.push(record)
    return pkg
  }
  return mapReduce(approvedWaivers, toRecord, intoPackage, { totalCount: 0, byWaiverType: {}, records: [] })
}
