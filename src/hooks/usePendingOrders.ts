import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/** Nombre de commandes « En attente » (null tant que non chargé), rafraîchi toutes les 30 s. */
export function usePendingOrders(intervalMs = 30_000): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { count: c, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (!cancelled && !error) setCount(c ?? 0)
    }
    void load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, intervalMs)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [intervalMs])

  return count
}
