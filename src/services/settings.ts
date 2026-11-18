import { supabase } from '@/lib/supabase'
import type { RestaurantSettings } from '@/types'

export async function fetchSettings(): Promise<RestaurantSettings> {
  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('name, description, whatsapp_number, phone, email, address, opening_hours, delivery_fee_xof, logo_url')
    .eq('id', 1)
    .single()
  if (error) throw error
  return data as RestaurantSettings
}
