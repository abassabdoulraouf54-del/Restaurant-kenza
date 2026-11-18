import { useContext } from 'react'
import { SettingsContext } from '@/contexts/settings-context'

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings doit être utilisé dans <SettingsProvider>')
  return ctx
}
