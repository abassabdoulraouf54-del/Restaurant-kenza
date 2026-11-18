import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { MessageCircle, Plus, Search } from 'lucide-react'
import Modal from '@/components/admin/Modal'
import { btnGhost, btnPrimary, inputCls, labelCls } from '@/components/admin/ui'
import { useSettings } from '@/hooks/useSettings'
import { fetchProducts } from '@/services/catalog'
import { adminCreateOrder, fetchOrderItems, fetchOrders, updateOrderStatus } from '@/services/admin'
import { formatDateTime, formatXOF, normalizeText } from '@/utils/format'
import { STATUS_LABEL, STATUS_ORDER, STATUS_STYLE } from '@/utils/orderStatus'
import { toInternationalPhone, waLink } from '@/utils/whatsapp'
import type { Fulfillment, OrderItemRow, OrderRow, OrderStatus, Product } from '@/types'

const PHONE_RE = /^\+?\d{8,15}$/
const normalizePhone = (raw: string) => (raw.trim().startsWith('+') ? '+' : '') + raw.replace(/\D/g, '')

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
}

/* ---------- Détail d'une commande ---------- */

function OrderDetail({
  order,
  restaurantName,
  onClose,
  onChanged,
}: {
  order: OrderRow
  restaurantName: string
  onClose: () => void
  onChanged: () => void
}) {
  const [items, setItems] = useState<OrderItemRow[] | null>(null)
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchOrderItems(order.id)
      .then((i) => {
        if (!cancelled) setItems(i)
      })
      .catch(() => {
        if (!cancelled) setError('Articles indisponibles.')
      })
    return () => {
      cancelled = true
    }
  }, [order.id])

  async function change(next: OrderStatus) {
    if (next === status) return
    if (next === 'cancelled' && !window.confirm('Annuler cette commande ?')) return
    setBusy(true)
    setError(null)
    try {
      await updateOrderStatus(order.id, next)
      setStatus(next)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Changement de statut impossible.')
    } finally {
      setBusy(false)
    }
  }

  const contactUrl = waLink(
    toInternationalPhone(order.customer_phone),
    `Bonjour ${order.customer_name}, ici ${restaurantName}. Concernant votre commande ${order.reference} :`,
  )

  return (
    <Modal title={`Commande ${order.reference}`} onClose={onClose} wide>
      <div className="grid gap-6 sm:grid-cols-2">
        <dl className="space-y-2 text-sm">
          <div><dt className="text-kenza-black/60">Client</dt><dd className="font-semibold">{order.customer_name}</dd></div>
          <div><dt className="text-kenza-black/60">Téléphone</dt><dd className="font-semibold">{order.customer_phone}</dd></div>
          <div><dt className="text-kenza-black/60">Date</dt><dd>{formatDateTime(order.created_at)}</dd></div>
          <div>
            <dt className="text-kenza-black/60">Mode de réception</dt>
            <dd>{order.fulfillment_type === 'delivery' ? 'Livraison' : 'Retrait sur place'}</dd>
          </div>
          {order.delivery_address && <div><dt className="text-kenza-black/60">Adresse</dt><dd className="whitespace-pre-line">{order.delivery_address}</dd></div>}
          {order.notes && <div><dt className="text-kenza-black/60">Instructions</dt><dd className="whitespace-pre-line">{order.notes}</dd></div>}
          <div><dt className="text-kenza-black/60">Origine</dt><dd>{order.source === 'website' ? 'Site web' : 'Saisie manuelle (WhatsApp)'}</dd></div>
        </dl>

        <div>
          <label htmlFor="status" className={labelCls}>Statut</label>
          <select id="status" value={status} disabled={busy} onChange={(e) => void change(e.target.value as OrderStatus)} className={inputCls}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <a href={contactUrl} target="_blank" rel="noopener noreferrer" className={`${btnPrimary} mt-4 w-full bg-[#25D366] text-kenza-black hover:bg-[#1ebe5a]`}>
            <MessageCircle size={16} /> Contacter le client sur WhatsApp
          </a>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

      <h3 className="mt-6 font-display text-lg font-semibold">Articles</h3>
      {!items ? (
        <p className="mt-2 text-sm text-kenza-black/60">Chargement…</p>
      ) : (
        <ul className="mt-2 divide-y divide-kenza-black/10 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>{i.quantity} × {i.product_name} <span className="text-kenza-black/50">({formatXOF(i.unit_price_xof)})</span></span>
              <span className="font-semibold">{formatXOF(i.line_total_xof)}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-4 space-y-1 border-t border-kenza-black/10 pt-4 text-sm">
        <div className="flex justify-between"><dt>Sous-total</dt><dd>{formatXOF(order.subtotal_xof)}</dd></div>
        <div className="flex justify-between"><dt>Livraison</dt><dd>{formatXOF(order.delivery_fee_xof)}</dd></div>
        <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatXOF(order.total_xof)}</dd></div>
      </dl>
    </Modal>
  )
}

/* ---------- Saisie manuelle d'une commande reçue par WhatsApp ---------- */

function ManualOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: (reference: string) => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchProducts()
      .then((p) => {
        if (!cancelled) setProducts(p.filter((x) => x.is_available))
      })
      .catch(() => {
        if (!cancelled) setError('Produits indisponibles.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const chosen = products.filter((p) => (qty[p.id] ?? 0) > 0)
  const subtotal = chosen.reduce((s, p) => s + p.price_xof * (qty[p.id] ?? 0), 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    if (name.trim().length < 2) return setError('Nom du client requis.')
    if (!PHONE_RE.test(normalizePhone(phone))) return setError('Numéro de téléphone invalide.')
    if (fulfillment === 'delivery' && address.trim().length < 5) return setError('Adresse de livraison requise.')
    if (chosen.length === 0) return setError('Ajoutez au moins un produit.')

    setSaving(true)
    setError(null)
    try {
      const result = await adminCreateOrder(
        { name: name.trim(), phone: normalizePhone(phone), fulfillment, address: address.trim(), notes: notes.trim() },
        chosen.map((p) => ({ productId: p.id, quantity: qty[p.id] ?? 0 })),
      )
      onCreated(result.reference)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
      setSaving(false)
    }
  }

  return (
    <Modal title="Saisir une commande WhatsApp" onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="m-name" className={labelCls}>Nom du client *</label>
            <input id="m-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="m-phone" className={labelCls}>Téléphone *</label>
            <input id="m-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+227 96 00 00 00" className={inputCls} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="m-ful" className={labelCls}>Mode de réception</label>
            <select id="m-ful" value={fulfillment} onChange={(e) => setFulfillment(e.target.value as Fulfillment)} className={inputCls}>
              <option value="pickup">Retrait sur place</option>
              <option value="delivery">Livraison</option>
            </select>
          </div>
          {fulfillment === 'delivery' && (
            <div>
              <label htmlFor="m-addr" className={labelCls}>Adresse *</label>
              <input id="m-addr" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
            </div>
          )}
        </div>

        <div>
          <span className={labelCls}>Produits</span>
          <ul className="divide-y divide-kenza-black/10 rounded-xl border border-kenza-black/10">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span>{p.name} <span className="text-kenza-black/50">({formatXOF(p.price_xof)})</span></span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  inputMode="numeric"
                  aria-label={`Quantité de ${p.name}`}
                  value={qty[p.id] ?? 0}
                  onChange={(e) => setQty((q) => ({ ...q, [p.id]: Math.max(0, Math.min(50, Math.floor(Number(e.target.value) || 0))) }))}
                  className="w-20 rounded-lg border border-kenza-gold/50 px-2 py-1.5 text-center"
                />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-kenza-black/60">Sous-total estimé : {formatXOF(subtotal)} (les montants officiels sont recalculés à l’enregistrement).</p>
        </div>

        <div>
          <label htmlFor="m-notes" className={labelCls}>Instructions</label>
          <textarea id="m-notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </div>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={btnGhost}>Annuler</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Enregistrement…' : 'Enregistrer la commande'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------- Liste des commandes ---------- */

export default function Orders() {
  const { settings } = useSettings()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      setOrders(await fetchOrders())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- chargement initial depuis Supabase
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim())
    return orders
      .filter((o) => statusFilter === 'all' || o.status === statusFilter)
      .filter((o) => !q || normalizeText(`${o.reference} ${o.customer_name} ${o.customer_phone}`).includes(q))
  }, [orders, statusFilter, query])

  const selected = orders.find((o) => o.id === selectedId) ?? null

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Commandes</h1>
        <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>
          <Plus size={16} /> Saisir une commande WhatsApp
        </button>
      </div>

      {notice && <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">{notice}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}

      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Rechercher une commande</span>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-kenza-black/40" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Référence, client ou téléphone…" className={`${inputCls} pl-11`} />
        </label>
        <label>
          <span className="sr-only">Filtrer par statut</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)} className={inputCls}>
            <option value="all">Tous les statuts</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="mt-6 text-kenza-black/70">Chargement…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-kenza-black/10 text-xs uppercase tracking-wide text-kenza-black/60">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Client</th>
                <th className="p-4">Téléphone</th>
                <th className="p-4">Date</th>
                <th className="p-4">Produits</th>
                <th className="p-4">Total</th>
                <th className="p-4">Réception</th>
                <th className="p-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kenza-black/10">
              {filtered.map((o) => (
                <tr key={o.id} onClick={() => setSelectedId(o.id)} className="cursor-pointer hover:bg-kenza-orange/5">
                  <td className="p-4 font-semibold">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedId(o.id) }} className="underline-offset-2 hover:underline">
                      {o.reference}
                    </button>
                  </td>
                  <td className="p-4">{o.customer_name}</td>
                  <td className="p-4">{o.customer_phone}</td>
                  <td className="p-4 whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                  <td className="max-w-[240px] truncate p-4" title={o.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}>
                    {o.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
                  </td>
                  <td className="p-4 font-semibold whitespace-nowrap">{formatXOF(o.total_xof)}</td>
                  <td className="p-4">{o.fulfillment_type === 'delivery' ? 'Livraison' : 'Retrait'}</td>
                  <td className="p-4"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-kenza-black/60">Aucune commande.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <OrderDetail
          key={selected.id}
          order={selected}
          restaurantName={settings?.name ?? 'Restaurant Kenza'}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load()}
        />
      )}

      {creating && (
        <ManualOrderModal
          onClose={() => setCreating(false)}
          onCreated={(reference) => {
            setCreating(false)
            setNotice(`Commande ${reference} enregistrée.`)
            void load()
          }}
        />
      )}
    </div>
  )
}
