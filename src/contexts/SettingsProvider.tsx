import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SettingsContext, type SettingsContextValue } from './settings-context'
import { fetchSettings } from '@/services/settings'
import type { RestaurantSettings } from '@/types'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchSettings()
      .then((s) => {
        if (cancelled) return
        setSettings(s)
        setError(null)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Impossible de charger les informations du restaurant.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadKey((k) => k + 1)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, error, retry }),
    [settings, loading, error, retry],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
