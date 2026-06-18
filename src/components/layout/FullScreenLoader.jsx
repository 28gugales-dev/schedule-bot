export function FullScreenLoader({ label = 'Loading…' }) {
  return (
    <div className="flex h-full min-h-screen items-center justify-center">
      <div className="glass-card flex flex-col items-center gap-3 px-8 py-7">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" />
        <p className="text-sm font-medium text-muted">{label}</p>
      </div>
    </div>
  )
}
