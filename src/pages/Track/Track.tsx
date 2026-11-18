import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, MessageCircle, Search } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useSettings } from '@/hooks/useSettings'
import { trackOrder } from '@/services/tracking'
import { RESTAURANT } from '@/lib/constants'
import { formatDateTime, formatXOF } from '@/utils/format'
import { STATUS_LABEL, STATUS_STYLE } from '@/utils/orderStatus'
import { waLink } from '@/utils/whatsapp'
import type { OrderStatus, TrackedOrder } from '@/types'

const MESSAGE: Record<OrderStatus, string> = {
  pending: 'Votre demande est enregistrée. Elle n’est pas encore confirmée : le restaurant doit la valider.',
  confirmed: 'Le restaurant a confirmé votre commande.',
  preparing: 'Votre commande est en cours de préparation.',
  ready: 'Votre commande est prête.',
  delivering: 'Votre commande est en cours de livraison.',
  completed: 'Votre commande est terminée. Merci et bon appétit !',
  cancelled: 'Cette commande a été annulée. Contactez le restaurant sur WhatsApp pour plus d’informations.',
}

const inputCls =
  'w-full rounded-xl border border-kenza-gold/50 bg-white px-4 py-3 outline-none focus:border-kenza-orange focus:ring-2 focus:ring-kenza-orange/20'

export default function Track() {
  usePageMeta('Suivre ma commande | Restaurant Kenza', undefined, true)
  const [params] = useSearchParams()
  const { settings } = useSettings()

  const [reference, setReference] = useState((params.get('ref') ?? '').toUpperCase())
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setOrder(null)
    if (reference.trim().length < 6 || phone.replace(/\D/g, '').length < 8) {
      setMessage('Saisissez la référence de la commande et le numéro de téléphone utilisé.')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const result = await trackOrder(reference, phone)
      if (result) setOrder(result)
      else setMessage('Aucune commande trouvée. Vérifiez la référence et le numéro utilisé pour la commande.')
    } catch {
      setMessage('Le suivi est momentanément indisponible. Réessayez dans un instant.')
    } finally {
      setBusy(false)
    }
  }

  const steps: OrderStatus[] =
    order?.fulfillment_type === 'delivery'
      ? ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'completed']
      : ['pending', 'confirmed', 'preparing', 'ready', 'completed']
  const currentIndex = order ? steps.indexOf(order.status) : -1

  const whatsapp = settings?.whatsapp_number ?? RESTAURANT.whatsappNumber

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mt-2 text-center font-display text-4xl font-bold">Suivre ma commande</h1>

      <form onSubmit={submit} noValidate className="mt-10 space-y-4 rounded-2xl border border-kenza-gold/30 bg-white p-6 sm:p-8">
        <div>
          <label htmlFor="ref" className="mb-1.5 block text-sm font-semibold">Référence de la commande</label>
          <input
            id="ref"
            value={reference}
            maxLength={30}
            placeholder="KZ-261118-0001"
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold">Numéro de téléphone utilisé</label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+227 96 00 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-kenza-orange px-8 py-3.5 font-semibold text-white transition hover:bg-kenza-orange-dark disabled:opacity-50"
        >
          <Search size={18} /> {busy ? 'Recherche…' : 'Suivre ma commande'}
        </button>
        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      </form>

      {order && (
        <div className="mt-8 rounded-2xl border border-kenza-gold/30 bg-white p-6 sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-xl font-semibold">{order.reference}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[order.status]}`}>
              {STATUS_LABEL[order.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-kenza-black/60">Passée le {formatDateTime(order.created_at)}</p>
          <p className="mt-4 rounded-xl bg-kenza-gold/15 px-4 py-3 text-sm">{MESSAGE[order.status]}</p>

          {order.status !== 'cancelled' && (
            <ol className="mt-6 space-y-3">
              {steps.map((s, i) => {
                const done = i <= currentIndex
                return (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                        done ? 'border-kenza-orange bg-kenza-orange text-white' : 'border-kenza-black/20 text-kenza-black/40'
                      }`}
                    >
                      {done ? <Check size={14} /> : i + 1}
                    </span>
                    <span className={done ? 'font-semibold' : 'text-kenza-black/50'}>{STATUS_LABEL[s]}</span>
                  </li>
                )
              })}
            </ol>
          )}

          <ul className="mt-6 divide-y divide-kenza-black/10 border-t border-kenza-black/10 text-sm">
            {order.items.map((i) => (
              <li key={i.name} className="py-2">{i.quantity} × {i.name}</li>
            ))}
          </ul>
          <p className="mt-2 text-right font-bold">Total : {formatXOF(order.total)}</p>

          <a
            href={waLink(whatsapp, `Bonjour, je souhaite des nouvelles de ma commande ${order.reference}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-kenza-black"
          >
            <MessageCircle size={18} /> Contacter le restaurant
          </a>
        </div>
      )}
    </section>
  )
}
