import { usePageMeta } from '@/hooks/usePageMeta'
import { Link } from 'react-router-dom'

export default function NotFound() {
  usePageMeta("Page introuvable | Restaurant Kenza", undefined, true)
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-kenza-orange">Erreur 404</p>
      <h1 className="mt-3 font-display text-4xl font-bold">Page introuvable</h1>
      <Link to="/" className="mt-8 inline-block rounded-full bg-kenza-orange px-8 py-3 font-semibold text-white">
        Retour à l’accueil
      </Link>
    </section>
  )
}
