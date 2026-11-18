import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type OrderEvent = 'INSERT' | 'UPDATE' | 'DELETE'

/** Écoute les changements de la table orders. Renvoie true tant que la connexion temps réel est active. */
export function useOrdersRealtime(onEvent: (type: OrderEvent) => void): boolean {
  const [live, setLive] = useState(false)
  const handler = useRef(onEvent)

  useEffect(() => {
    handler.current = onEvent
  }, [onEvent])

  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        handler.current(payload.eventType)
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  return live
}
