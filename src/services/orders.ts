import { supabase } from '@/lib/supabase'
import type { CartLine, CustomerInfo, OrderResult } from '@/types'

/** Commande refusée par les règles de la base (produit indisponible, champ invalide…). */
export class OrderRejectedError extends Error {}

export async function createOrder(customer: CustomerInfo, lines: CartLine[]): Promise<OrderResult> {
  const { data, error } = await supabase.rpc('create_order', {
    p_name: customer.name,
    p_phone: customer.phone,
    p_fulfillment: customer.fulfillment,
    p_address: customer.fulfillment === 'delivery' ? customer.address : null,
    p_notes: customer.notes || null,
    // Seuls l'identifiant et la quantité sont envoyés : la base recalcule les prix.
    p_items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
  })

  if (error) {
    if (error.code === 'P0001') throw new OrderRejectedError(error.message)
    throw error
  }
  return data as OrderResult
}
