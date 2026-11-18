import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [role, setRole] = useState<{ userId: string; isAdmin: boolean } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null

  // Le rôle est lu dans la base (table profiles protégée par RLS).
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!cancelled) setRole({ userId, isAdmin: !error && data?.role === 'admin' })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return error ? 'E-mail ou mot de passe incorrect.' : null
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setRole(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const roleReady = userId !== null && role?.userId === userId
    return {
      session,
      isAdmin: roleReady && role.isAdmin,
      loading: sessionLoading || (userId !== null && !roleReady),
      signIn,
      signOut,
    }
  }, [session, sessionLoading, role, userId, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
