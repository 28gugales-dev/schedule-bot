import Deck from './deck/Deck'
import ErrorBoundary from './ErrorBoundary'

export default function App() {
  return (
    <main className="h-full w-full bg-canvas">
      <ErrorBoundary>
        <Deck />
      </ErrorBoundary>
    </main>
  )
}
