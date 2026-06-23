import { Component } from 'react'

// Catches any render/runtime error in the deck so a single throw shows a readable
// message instead of unmounting the whole tree to a blank white screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Deck render error:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full w-full place-items-center bg-canvas p-12 text-center">
          <div className="max-w-[68ch]">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-warm">Deck error</p>
            <p className="mt-3 font-display text-2xl font-semibold text-ink">
              Something threw while rendering a slide.
            </p>
            <pre className="mt-5 max-h-[40vh] overflow-auto rounded-xl border border-border bg-panel p-5 text-left text-xs leading-relaxed text-muted">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
