import { createContext } from 'react'
import type { RestaurantSettings } from '@/types'

export interface SettingsContextValue {
  settings: RestaurantSettings | null
  loading: boolean
  error: string | null
  retry: () => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)
