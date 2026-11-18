import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Logo from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import { btnPrimary, inputCls, labelCls } from '@/components/admin/ui'

export default function Login() {
  const { session, isAdmin, loading, signIn, signOut } = useAuth()
  const location = useLocation()
  const requested = (location.state as { from?: string } | null)?.from
  const from = requested && requested.startsWith('/admin') ? requested : '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && session && isAdmin) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const message = await signIn(email, password)
    if (message) setError(message)
    setBusy(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-kenza-black px-4">
      <div className="w-full max-w-sm rounded-2xl bg-kenza-cream p-8 shadow-2xl">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold">Espace administrateur</h1>

        {!loading && session && !isAdmin ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-red-700">Ce compte n’a pas les droits d’administration.</p>
            <button type="button" onClick={() => void signOut()} className={`${btnPrimary} mt-4`}>
              Changer de compte
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className={labelCls}>E-mail</label>
              <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="password" className={labelCls}>Mot de passe</label>
              <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy || loading} className={`${btnPrimary} w-full py-3`}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
