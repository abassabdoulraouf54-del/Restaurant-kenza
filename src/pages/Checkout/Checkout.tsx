import { usePageMeta } from '@/hooks/usePageMeta'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CheckCircle2, MessageCircle, TriangleAlert } from 'lucide-react'
import { useCatalog } from '@/hooks/useCatalog'
import { useSettings } from '@/hooks/useSettings'
import { useCart } from '@/hooks/useCart'
import { createOrder, OrderRejectedError } from '@/services/orders'
import { buildOrderMessage, buildWhatsAppUrl } from '@/utils/whatsapp'
import { formatXOF } from '@/utils/format'
import type { CustomerInfo, Fulfillment } from '@/types'

type Errors = Partial<Record<'name' | 'phone' | 'address' | 'notes', string>>

const PHONE_RE = /^\+?\d{8,15}$/

function normalizePhone(raw: string): string {
  const t = raw.trim()
  return (t.startsWith('+') ? '+' : '') + t.replace(/\D/g, '')
}

function validate(form: CustomerInfo): Errors {
  const e: Errors = {}
  const name = form.name.trim()
  if (name.length < 2) e.name = 'Veuillez saisir votre nom complet.'
  else if (name.length > 100) e.name = 'Nom trop long (100 caractères maximum).'
  if (!PHONE_RE.test(normalizePhone(form.phone))) e.phone = 'Numéro invalide. Exemple : +227 96 00 00 00.'
  if (form.fulfillment === 'delivery') {
    const a = form.address.trim()
    if (a.length < 5) e.address = 'Veuillez indiquer une adresse de livraison précise.'
    else if (a.length > 300) e.address = 'Adresse trop longue (300 caractères maximum).'
  }
  if (form.notes.length > 500) e.notes = 'Instructions trop longues (500 caractères maximum).'
  return e
}

const inputClass = (invalid: boolean) =>
  `w-full rounded-xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-kenza-orange/20 ${
    invalid ? 'border-red-500' : 'border-kenza-gold/50 focus:border-kenza-orange'
  }`

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

interface SentState {
  url: string
  reference: string | null
  total: number
}

export default function Checkout() {
  usePageMeta("Valider ma commande | Restaurant Kenza", undefined, true)
  const catalog = useCatalog()
  const { settings, loading: settingsLoading, error: settingsError, retry: retrySettings } = useSettings()
  const { lines, clear } = useCart()

  const [form, setForm] = useState<CustomerInfo>({
    name: '',
    phone: '',
    fulfillment: 'pickup',
    address: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<{ message: string; canFallback: boolean } | null>(null)
  const [sent, setSent] = useState<SentState | null>(null)

  const { items, hasInvalid } = useMemo(() => {
    const byId = new Map(catalog.products.map((p) => [p.id, p] as const))
    const result: { name: string; quantity: number; unit_price: number; line_total: number }[] = []
    let invalid = false
    for (const l of lines) {
      const p = byId.get(l.productId)
      if (!p || !p.is_available) {
        invalid = true
        continue
      }
      result.push({ name: p.name, quantity: l.quantity, unit_price: p.price_xof, line_total: p.price_xof * l.quantity })
    }
    return { items: result, hasInvalid: invalid }
  }, [catalog.products, lines])

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)
  const deliveryFee = form.fulfillment === 'delivery' ? (settings?.delivery_fee_xof ?? 0) : 0
  const total = subtotal + deliveryFee

  const update = <K extends keyof CustomerInfo>(key: K, value: CustomerInfo[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // --- Écran de résultat ---
  if (sent) {
    const saved = sent.reference !== null
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        {saved ? (
          <CheckCircle2 size={52} className="mx-auto text-kenza-orange" />
        ) : (
          <TriangleAlert size={52} className="mx-auto text-amber-600" />
        )}
        <h1 className="mt-4 font-display text-3xl font-bold">
          {saved ? 'Votre demande est enregistrée' : 'Demande prête à être envoyée'}
        </h1>
        {saved ? (
          <p className="mt-3 text-kenza-black/70">
            Référence : <strong>{sent.reference}</strong>. Montant : <strong>{formatXOF(sent.total)}</strong>.
          </p>
        ) : (
          <p className="mt-3 text-kenza-black/70">
            Votre demande n’a pas pu être enregistrée sur le site. Elle ne sera prise en compte que si vous
            l’envoyez sur WhatsApp.
          </p>
        )}
        <p className="mt-3 rounded-xl bg-kenza-gold/15 px-4 py-3 text-sm">
          Votre commande n’est <strong>pas encore confirmée</strong>. Envoyez le message sur WhatsApp, puis attendez
          la confirmation du restaurant (disponibilité et montant définitif).
        </p>
        <a
          href={sent.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-4 font-semibold text-kenza-black transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <MessageCircle size={20} /> Envoyer ma commande sur WhatsApp
        </a>
        {saved && (
          <p className="mt-6 text-sm">
            <Link to={`/suivi?ref=${sent.reference}`} className="font-semibold text-kenza-orange underline">
              Suivre ma commande
            </Link>
          </p>
        )}
        <div className="mt-6">
          <Link to={saved ? '/menu' : '/panier'} className="text-sm underline hover:text-kenza-orange">
            {saved ? 'Retour au menu' : 'Retour au panier'}
          </Link>
        </div>
      </section>
    )
  }

  if (lines.length === 0) return <Navigate to="/panier" replace />

  if (catalog.loading || settingsLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-24 text-center text-kenza-black/70">Chargement…</p>
  }

  if (catalog.error || settingsError || !settings) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          {catalog.error ?? settingsError ?? 'Une erreur est survenue.'}
        </p>
        <button
          type="button"
          onClick={() => {
            catalog.retry()
            retrySettings()
          }}
          className="mt-4 rounded-full bg-kenza-orange px-6 py-2.5 font-semibold text-white"
        >
          Réessayer
        </button>
      </section>
    )
  }

  const customer = (): CustomerInfo => ({
    ...form,
    name: form.name.trim(),
    phone: normalizePhone(form.phone),
    address: form.address.trim(),
    notes: form.notes.trim(),
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting || !settings || hasInvalid) return
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setFailure(null)
    setSubmitting(true)
    // Onglet ouvert pendant le clic pour éviter le blocage des pop-ups
    const popup = window.open('', '_blank')
    try {
      const c = customer()
      const result = await createOrder(c, lines)
      const url = buildWhatsAppUrl(
        settings.whatsapp_number,
        buildOrderMessage({
          restaurantName: settings.name,
          reference: result.reference,
          customer: c,
          items: result.items,
          subtotal: result.subtotal,
          deliveryFee: result.delivery_fee,
          total: result.total,
        }),
      )
      clear()
      setSent({ url, reference: result.reference, total: result.total })
      if (popup) popup.location.href = url
    } catch (err) {
      popup?.close()
      if (err instanceof OrderRejectedError) {
        setFailure({ message: `Commande refusée : ${err.message.replace(/\.$/, '')}. Si le problème continue, contactez le restaurant sur WhatsApp.`, canFallback: false })
      } else {
        setFailure({
          message: 'Votre commande n’a pas pu être enregistrée (problème de connexion).',
          canFallback: true,
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  function sendWithoutSaving() {
    if (!settings) return
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length > 0) return
    const url = buildWhatsAppUrl(
      settings.whatsapp_number,
      buildOrderMessage({
        restaurantName: settings.name,
        reference: null,
        customer: customer(),
        items,
        subtotal,
        deliveryFee,
        total,
      }),
    )
    window.open(url, '_blank', 'noopener,noreferrer')
    setSent({ url, reference: null, total })
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">Valider ma commande</h1>

      {hasInvalid && (
        <div className="mt-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert size={20} className="shrink-0" />
          <p>
            Certains produits de votre panier ne sont plus disponibles.{' '}
            <Link to="/panier" className="font-semibold underline">
              Modifier mon panier
            </Link>
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-2xl border border-kenza-gold/30 bg-white p-6 sm:p-8">
          <Field id="name" label="Nom complet *" error={errors.name}>
            <input
              id="name"
              type="text"
              autoComplete="name"
              maxLength={100}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={inputClass(!!errors.name)}
            />
          </Field>

          <Field id="phone" label="Numéro de téléphone *" error={errors.phone}>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+227 96 00 00 00"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
              className={inputClass(!!errors.phone)}
            />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Mode de réception *</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['pickup', 'Retrait sur place'],
                ['delivery', 'Livraison'],
              ] as [Fulfillment, string][]).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                    form.fulfillment === value
                      ? 'border-kenza-orange bg-kenza-orange/10'
                      : 'border-kenza-gold/50 hover:border-kenza-orange'
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value={value}
                    checked={form.fulfillment === value}
                    onChange={() => update('fulfillment', value)}
                    className="accent-kenza-orange"
                  />
                  <span className="font-medium">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {form.fulfillment === 'delivery' && (
            <Field id="address" label="Adresse de livraison *" error={errors.address}>
              <textarea
                id="address"
                rows={3}
                maxLength={300}
                autoComplete="street-address"
                placeholder="Quartier, rue, repère connu…"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? 'address-error' : undefined}
                className={inputClass(!!errors.address)}
              />
            </Field>
          )}

          <Field id="notes" label="Instructions particulières (facultatif)" error={errors.notes}>
            <textarea
              id="notes"
              rows={3}
              maxLength={500}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              aria-invalid={!!errors.notes}
              aria-describedby={errors.notes ? 'notes-error' : undefined}
              className={inputClass(!!errors.notes)}
            />
          </Field>

          {failure && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p>{failure.message}</p>
              {failure.canFallback && (
                <div className="mt-3 space-y-2">
                  <p>
                    Vous pouvez réessayer, ou envoyer votre demande directement sur WhatsApp. Dans ce cas, elle ne
                    sera pas enregistrée sur le site.
                  </p>
                  <button
                    type="button"
                    onClick={sendWithoutSaving}
                    className="rounded-full border border-red-300 bg-white px-4 py-2 font-semibold text-red-800 hover:bg-red-100"
                  >
                    Envoyer quand même sur WhatsApp
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || hasInvalid}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-kenza-orange px-8 py-4 font-semibold text-white transition hover:bg-kenza-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MessageCircle size={20} />
            {submitting ? 'Enregistrement…' : 'Envoyer ma commande sur WhatsApp'}
          </button>
          <p className="text-center text-xs text-kenza-black/60">
            L’ouverture de WhatsApp ne confirme pas la commande : le restaurant doit la valider.
          </p>
        </form>

        <aside className="h-fit rounded-2xl bg-kenza-black p-6 text-kenza-cream lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-semibold text-kenza-gold">Récapitulatif</h2>
          <ul className="mt-4 divide-y divide-white/10 text-sm">
            {items.map((i) => (
              <li key={i.name} className="flex justify-between gap-3 py-2.5">
                <span>
                  {i.quantity} × {i.name}
                </span>
                <span className="shrink-0">{formatXOF(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Sous-total</dt>
              <dd>{formatXOF(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Livraison</dt>
              <dd>{form.fulfillment === 'delivery' ? formatXOF(deliveryFee) : '—'}</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-bold">
              <dt>Total</dt>
              <dd className="text-kenza-gold">{formatXOF(total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-kenza-cream/60">
            Prix provisoires. Le montant définitif est recalculé par le serveur puis confirmé par le restaurant.
          </p>
        </aside>
      </div>
    </section>
  )
}
