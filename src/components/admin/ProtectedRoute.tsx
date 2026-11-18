import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute() {
  const { session, isAdmin, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="p-16 text-center text-kenza-black/70">Chargement…</p>
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Accès refusé</h1>
        <p className="mt-3 text-kenza-black/70">Ce compte n’a pas les droits d’administration.</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 rounded-full bg-kenza-orange px-6 py-2.5 font-semibold text-white"
        >
          Se déconnecter
        </button>
      </section>
    )
  }

  return <Outlet />
}
