import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="fade-up flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="glass-card flex flex-col items-center gap-3 px-10 py-12">
        <p className="font-hero text-7xl text-brand-600">404</p>
        <p className="font-display text-lg text-ink">Page not found</p>
        <Link to="/" className="text-sm font-medium text-brand-600 hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  )
}
