import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-kenza-cream px-4 text-center">
        <h1 className="font-display text-3xl font-bold">Une erreur est survenue</h1>
        <p className="max-w-md text-kenza-black/70">
          Le site a rencontré un problème inattendu. Actualisez la page ou revenez à l’accueil.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="rounded-full bg-kenza-orange px-8 py-3 font-semibold text-white hover:bg-kenza-orange-dark"
        >
          Retour à l’accueil
        </button>
      </main>
    )
  }
}
