import { supabase } from '@/lib/supabase'
import type { TrackedOrder } from '@/types'

/** Renvoie null si la référence et le numéro ne correspondent à aucune commande. */
export async function trackOrder(reference: string, phone: string): Promise<TrackedOrder | null> {
  const { data, error } = await supabase.rpc('track_order', {
    p_reference: reference.trim(),
    p_phone: phone.trim(),
  })
  if (error) throw error
  return (data as TrackedOrder | null) ?? null
}
