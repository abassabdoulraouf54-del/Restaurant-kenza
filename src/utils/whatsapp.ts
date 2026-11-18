import { formatXOF } from './format'
import type { CustomerInfo } from '@/types'

export interface MessageItem {
  name: string
  quantity: number
  unit_price: number
  line_total: number
}

interface MessageInput {
  restaurantName: string
  /** null = commande non enregistrée sur le site */
  reference: string | null
  customer: CustomerInfo
  items: MessageItem[]
  subtotal: number
  deliveryFee: number
  total: number
}

export function buildOrderMessage(p: MessageInput): string {
  const delivery = p.customer.fulfillment === 'delivery'
  const out: string[] = []

  out.push(`BONJOUR ${p.restaurantName.toUpperCase()} !`, '', 'Nouvelle demande de commande.')
  out.push(
    p.reference
      ? `Référence : ${p.reference}`
      : 'ATTENTION : demande non enregistrée sur le site. Montants calculés sur le site, à vérifier.',
  )

  out.push('', 'CLIENT :', `Nom : ${p.customer.name}`, `Téléphone : ${p.customer.phone}`)

  out.push('', 'COMMANDE :')
  for (const it of p.items) {
    out.push(
      `- Produit : ${it.name}`,
      `  Quantité : ${it.quantity}`,
      `  Prix unitaire : ${formatXOF(it.unit_price)}`,
      `  Sous-total : ${formatXOF(it.line_total)}`,
    )
  }

  out.push('', 'MODE DE RÉCEPTION :', delivery ? 'Livraison' : 'Retrait sur place')
  out.push('', 'ADRESSE :', delivery ? p.customer.address : 'Sans objet (retrait)')

  out.push(
    '',
    'RÉCAPITULATIF :',
    `Sous-total : ${formatXOF(p.subtotal)}`,
    `Livraison : ${formatXOF(p.deliveryFee)}`,
    `TOTAL À PAYER : ${formatXOF(p.total)}`,
  )

  out.push('', 'INSTRUCTIONS :', p.customer.notes || 'Aucune')
  out.push('', 'Merci de confirmer la disponibilité et la commande.')

  return out.join('\n')
}

export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

/** Lien WhatsApp simple (sans message prérempli si `message` est omis). */
export function waLink(number: string, message?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, '')}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/** Numéro au format international pour wa.me (ajoute 227 aux numéros nigériens à 8 chiffres). */
export function toInternationalPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 8) digits = `227${digits}`
  return digits
}
