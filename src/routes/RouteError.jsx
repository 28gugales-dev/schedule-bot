import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'

// Route-level error boundary for the data router. React Router v7's
// createBrowserRouter intercepts errors thrown while rendering route elements
// and renders the nearest route `errorElement` — it does NOT rethrow to a React
// error boundary placed outside <RouterProvider>. So this, wired as the root
// route's errorElement (see router.jsx), is what actually catches page crashes.
// Theming is unaffected by tree position: data-theme/data-skin live on <html>,
// so the token utilities below resolve regardless of where this renders.
export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error?.message || 'An unexpected error interrupted this view.'

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div role="alert" className="glass-card flex max-w-md flex-col gap-3 p-6 text-center">
        <p className="font-display text-lg font-semibold text-ink">Something went wrong</p>
        <p className="text-sm text-muted">{message}</p>
        <div className="mt-1 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => location.reload()}
            className="rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Reload
          </button>
          <Link
            to="/"
            className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
