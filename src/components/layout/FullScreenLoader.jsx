export function FullScreenLoader({ label = 'Loading…' }) {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-[#f6f8fb]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  )
}
