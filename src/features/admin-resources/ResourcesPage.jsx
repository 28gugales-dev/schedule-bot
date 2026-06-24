import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  fetchResources,
  createResource,
  deleteResource,
  getResourceUrl,
} from '../../services/api.js'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { actorFromAuth } from '../../services/audit.js'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'

// Categories teachers file resources under. `key` is what's stored; `label` shown.
// `courseList`/`prereqs` align with the doc kinds counselors talk about daily.
const CATEGORIES = [
  { key: 'courseList', label: 'Course lists' },
  { key: 'prereqs', label: 'Prerequisites' },
  { key: 'policy', label: 'Policies' },
  { key: 'form', label: 'Form templates' },
  { key: 'other', label: 'Other' },
]
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]))

function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

const FileIcon = () => (
  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 2.5h6L15 6.5V16a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 16V2.5Z" />
    <path d="M11 2.5V6.5H15" />
  </svg>
)

// ── Upload form ──────────────────────────────────────────────────────────────

function UploadCard({ onAdd, busy }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('courseList')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const fileRef = useRef(null)

  const reset = () => {
    setTitle('')
    setDescription('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    if (!title.trim() && !file) return
    const ok = await onAdd({ title, category, description, file })
    if (ok) reset()
  }

  return (
    <div className="glass-card space-y-3 p-5">
      <h2 className="text-base font-semibold text-ink">Add a resource</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="res-title" className="text-xs font-medium text-muted">Title</label>
          <input
            id="res-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2026–27 Course Catalog"
            className="glass-input px-3 py-1.5 text-sm text-ink"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="res-category" className="text-xs font-medium text-muted">Category</label>
          <select
            id="res-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="glass-input px-3 py-1.5 text-sm text-ink"
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="res-desc" className="text-xs font-medium text-muted">Description <span className="font-normal">(optional)</span></label>
        <textarea
          id="res-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this and when should staff use it?"
          className="glass-input px-3 py-2 text-sm text-ink"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-glass-hover file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink"
          aria-label="Attach a file (optional)"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || (!title.trim() && !file)}
          className="ml-auto rounded-xl bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? 'Adding…' : '+ Add resource'}
        </button>
      </div>
    </div>
  )
}

// ── Resource row ───────────────────────────────────────────────────────────────

function ResourceRow({ resource, onOpen, onDelete }) {
  const [opening, setOpening] = useState(false)
  const hasFile = Boolean(resource.url || resource.path)
  // Absolute http(s) URLs (e.g. a SharePoint workbook) open directly via a real
  // anchor — reliable new-tab behaviour, no popup-blocker/SPA-router glitch.
  const externalUrl = /^https?:\/\//i.test(resource.url ?? '') ? resource.url : null

  const open = async () => {
    setOpening(true)
    try {
      await onOpen(resource)
    } finally {
      setOpening(false)
    }
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <FileIcon />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{resource.title}</p>
        {resource.description && <p className="mt-0.5 text-xs text-muted">{resource.description}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-700 transition hover:underline dark:text-brand-300"
            >
              {resource.fileName || 'Open file'}
            </a>
          ) : hasFile ? (
            <button
              type="button"
              onClick={open}
              disabled={opening}
              className="font-medium text-brand-700 transition hover:underline disabled:opacity-50 dark:text-brand-300"
            >
              {opening ? 'Opening…' : (resource.fileName || 'Open file')}
            </button>
          ) : (
            <span className="italic">No file attached</span>
          )}
          {resource.size > 0 && <span>· {formatBytes(resource.size)}</span>}
          {resource.createdAt && <span>· Added {formatDate(resource.createdAt)}</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(resource)}
        aria-label={`Remove ${resource.title}`}
        className="rounded-md p-1 text-muted transition hover:text-danger-600"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" /></svg>
      </button>
    </li>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ResourcesPage() {
  const { user, role } = useAuth()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchResources()
      .then((list) => { if (!cancelled) { setResources(list); setLoading(false) } })
      .catch((e) => {
        if (cancelled) return
        // In real mode this is usually "table/bucket not created yet" — name the fix.
        setError(e?.message?.includes('resources')
          ? 'Resource library backend not set up yet (apply migration 0007).'
          : (e?.message ?? 'Could not load resources.'))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [reloadKey])

  const handleAdd = useCallback(async (input) => {
    setBusy(true)
    setError(null)
    try {
      const created = await createResource(input, actorFromAuth(user, role))
      setResources((prev) => [created, ...prev])
      return true
    } catch (e) {
      setError(e?.message ?? 'Could not add the resource.')
      return false
    } finally {
      setBusy(false)
    }
  }, [user, role])

  const handleDelete = useCallback(async (resource) => {
    setConfirmDelete(null)
    setError(null)
    try {
      await deleteResource(resource.id, resource.path ?? null, actorFromAuth(user, role))
      setResources((prev) => prev.filter((r) => r.id !== resource.id))
    } catch (e) {
      setError(e?.message ?? 'Could not remove the resource.')
    }
  }, [user, role])

  const handleOpen = useCallback(async (resource) => {
    try {
      const url = resource.url || (resource.path ? await getResourceUrl(resource.path) : null)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      else setError('That file is no longer available.')
    } catch (e) {
      setError(e?.message ?? 'Could not open the file.')
    }
  }, [])

  // Group by category, in the CATEGORIES display order, dropping empty groups.
  const grouped = useMemo(() => {
    return CATEGORIES
      .map((c) => ({ ...c, items: resources.filter((r) => (r.category || 'other') === c.key) }))
      .filter((g) => g.items.length > 0)
  }, [resources])

  return (
    <section className="fade-up space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Resources</h1>
          <p className="mt-1 text-sm text-muted">
            A shared shelf for staff reference material — course lists, prerequisite matrices, eligibility policies.
            Upload once; the whole counseling team can pull from here. Students never see these.
          </p>
        </div>
        {error && <span className="max-w-xs text-sm text-danger-600 dark:text-danger-400" role="alert">{error}</span>}
      </div>

      <UploadCard onAdd={handleAdd} busy={busy} />

      {loading ? (
        <div className="glass-card p-8 text-center text-sm text-muted">Loading…</div>
      ) : resources.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-sm text-muted">No resources yet. Add the first one above.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.key} className="glass-card p-5">
              <div className="mb-1 flex items-center justify-between">
                <p className="eyebrow">{group.label}</p>
                <span className="text-xs text-muted">{group.items.length}</span>
              </div>
              <ul className="divide-y divide-hairline" role="list">
                {group.items.map((r) => (
                  <ResourceRow key={r.id} resource={r} onOpen={handleOpen} onDelete={(res) => setConfirmDelete(res)} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        tone="danger"
        title={`Remove "${confirmDelete?.title ?? ''}"?`}
        message="This deletes the file from the shared library for everyone. This cannot be undone."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </section>
  )
}
