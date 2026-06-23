import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Mock api.js so the component's imports resolve regardless of which workstream
// has landed the shared withdrawRequest / requestRequestDeletion exports yet.
vi.mock('../../../services/api.js', () => ({
  withdrawRequest: vi.fn().mockResolvedValue({ ok: true }),
  requestRequestDeletion: vi.fn().mockResolvedValue({ ok: true }),
}))

import { StudentRequestActions } from '../StudentRequestActions.jsx'

const render = (request) =>
  renderToStaticMarkup(<StudentRequestActions request={request} onChanged={() => {}} />)

describe('StudentRequestActions', () => {
  it("status='submitted' -> Withdraw button present, deletion button absent", () => {
    const html = render({ id: 'r1', status: 'submitted' })
    expect(html).toContain('Withdraw request')
    expect(html).not.toContain('Request deletion')
    expect(html).not.toContain('Deletion requested')
  })

  it("status='denied' & no deletionRequestedAt -> deletion button present, Withdraw absent", () => {
    const html = render({ id: 'r2', status: 'denied', deletionRequestedAt: null })
    expect(html).toContain('Request deletion')
    expect(html).not.toContain('Withdraw request')
    expect(html).not.toContain('Deletion requested')
  })

  it("status='denied' & deletionRequestedAt set -> 'Deletion requested' pill, no action buttons", () => {
    const html = render({ id: 'r3', status: 'denied', deletionRequestedAt: '2026-06-23T00:00:00Z' })
    expect(html).toContain('Deletion requested')
    expect(html).not.toContain('Request deletion')
    expect(html).not.toContain('Withdraw request')
  })

  it("status='approved' -> deletion button present (terminal), Withdraw absent", () => {
    const html = render({ id: 'r4', status: 'approved' })
    expect(html).toContain('Request deletion')
    expect(html).not.toContain('Withdraw request')
  })

  it('renders nothing for a withdrawn request with deletion already requested only as pill', () => {
    const html = render({ id: 'r5', status: 'withdrawn', deletionRequestedAt: '2026-06-23T00:00:00Z' })
    expect(html).toContain('Deletion requested')
    expect(html).not.toContain('Withdraw request')
    expect(html).not.toContain('Request deletion')
  })
})
