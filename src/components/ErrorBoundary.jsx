import { Component } from 'react'

// Outer React error boundary. The data router catches errors thrown by ROUTE
// elements itself and routes them to the root errorElement (see routes/RouteError.jsx),
// so this guards the layer the router can't: errors thrown by the providers or
// during RouterProvider initialization. (Token theming works regardless of tree
// position — data-theme/data-skin live on <html>.) Accepts an optional `fallback`
// render prop — fallback(error, reset) — but ships a token-themed default.
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Real backend would ship this to an error reporter; mock just logs.
    console.error('ErrorBoundary caught:', error, info)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children

    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(this.state.error, this.reset)
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div role="alert" className="glass-card flex max-w-md flex-col gap-3 p-6 text-center">
          <p className="font-display text-lg font-semibold text-ink">Something went wrong</p>
          <p className="text-sm text-muted">
            {this.state.error?.message || 'An unexpected error interrupted this view.'}
          </p>
          <div className="mt-1 flex justify-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => location.reload()}
              className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
