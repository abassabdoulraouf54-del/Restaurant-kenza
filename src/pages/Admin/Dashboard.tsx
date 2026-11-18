import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Bell, BellOff, Download, RefreshCw } from 'lucide-react'
import { fetchDashboardExtra, fetchDashboardOverview, fetchOrders } from '@/services/admin'
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime'
import { formatDateTime, formatXOF } from '@/utils/format'
import { STATUS_LABEL, STATUS_ORDER, STATUS_STYLE } from '@/utils/orderStatus'
import type { DashboardExtra, DashboardOverview, OrderRow, OrderStatus } from '@/types'

const PERIODS = [7, 14, 30] as const
const TZ = 'Africa/Niamey'

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: '#d97706',
  confirmed: '#2563eb',
  preparing: '#ea580c',
  ready: '#0d9488',
  delivering: '#4f46e5',
  completed: '#16a34a',
  cancelled: '#dc2626',
}
const FULFILLMENT_LABEL: Record<string, string> = { delivery: 'Livraison', pickup: 'À emporter' }

function beep() {
  try {
    const ctx = new window.AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = () => void ctx.close()
  } catch {
    /* son indisponible */
  }
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} M`
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`
  return String(Math.round(n))
}

function niceCeil(v: number): number {
  if (v <= 1) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

const fmtDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

function exportCsv(daily: DashboardOverview['daily']) {
  const rows = ['date;chiffre_affaires_xof;commandes', ...daily.map((d) => `${d.day};${d.revenue};${d.orders}`)]
  const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ventes_${daily[0]?.day ?? 'debut'}_${daily.at(-1)?.day ?? 'fin'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  if (now === 0 && before === 0) return <span className="text-xs text-kenza-black/50">Identique {label}</span>
  if (before === 0) return <span className="text-xs font-semibold text-green-700">Nouveau {label}</span>
  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return <span className="text-xs text-kenza-black/50">Stable {label}</span>
  const up = pct > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-green-700' : 'text-red-700'}`}>
      <Icon size={14} />
      {Math.abs(pct)} % {label}
    </span>
  )
}

function Kpi({ label, value, footer, highlight = false }: { label: string; value: string; footer: ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'border-amber-300 bg-amber-50' : 'border-kenza-black/10 bg-white'}`}>
      <p className="text-sm text-kenza-black/60">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
      <div className="mt-2 min-h-5">{footer}</div>
    </div>
  )
}

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border border-kenza-black/10 bg-white p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function RevenueChart({ daily }: { daily: DashboardOverview['daily'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 760
  const H = 240
  const L = 48
  const R = 8
  const T = 10
  const B = 28
  const innerW = W - L - R
  const innerH = H - T - B
  const max = niceCeil(Math.max(1, ...daily.map((d) => d.revenue)))
  const step = innerW / daily.length
  const x = (i: number) => L + step * i + step / 2
  const y = (v: number) => T + innerH - (v / max) * innerH
  const line = daily.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.revenue)}`).join(' ')
  const area = `${line} L${x(daily.length - 1)},${T + innerH} L${x(0)},${T + innerH} Z`
  const every = daily.length > 14 ? 3 : 1
  const hasSales = daily.some((d) => d.revenue > 0)
  const h = hover !== null ? daily[hover] : null

  return (
    <>
      <p className="mb-3 flex min-h-5 flex-wrap gap-x-4 text-sm text-kenza-black/70" aria-live="polite">
        {h ? (
          <>
            <span className="font-semibold text-kenza-black">{fmtDay(h.day)}</span>
            <span>{formatXOF(h.revenue)}</span>
            <span>{plural(h.orders, 'commande')}</span>
          </>
        ) : (
          <span>Survolez le graphique pour voir le détail de chaque jour.</span>
        )}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Chiffre d’affaires des ${daily.length} derniers jours`} className="w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="text-kenza-orange">
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={T + innerH - t * innerH} y2={T + innerH - t * innerH} className="stroke-kenza-black/10" />
              <text x={L - 8} y={T + innerH - t * innerH + 4} textAnchor="end" fontSize="11" className="fill-kenza-black/50">
                {compact(max * t)}
              </text>
            </g>
          ))}
          {hasSales && (
            <>
              <path d={area} fill="url(#rev-fill)" />
              <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
          {hover !== null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + innerH} stroke="currentColor" strokeOpacity="0.3" />
              <circle cx={x(hover)} cy={y(daily[hover].revenue)} r="5" fill="currentColor" stroke="white" strokeWidth="2" />
            </>
          )}
        </g>
        {daily.map((d, i) =>
          (daily.length - 1 - i) % every === 0 ? (
            <text key={d.day} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" className="fill-kenza-black/60">
              {fmtDay(d.day)}
            </text>
          ) : null,
        )}
        {daily.map((d, i) => (
          <rect key={d.day} x={L + step * i} y={T} width={step} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
        ))}
      </svg>
      {!hasSales && <p className="mt-2 text-center text-sm text-kenza-black/60">Aucune vente terminée sur cette période.</p>}
    </>
  )
}

function Statuses({ statuses }: { statuses: DashboardOverview['statuses'] }) {
  const total = STATUS_ORDER.reduce((s, k) => s + (statuses[k] ?? 0), 0)
  if (total === 0) return <p className="text-sm text-kenza-black/60">Aucune commande sur cette période.</p>
  const present = STATUS_ORDER.filter((s) => (statuses[s] ?? 0) > 0)
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-kenza-black/10" role="img" aria-label="Répartition des commandes par statut">
        {present.map((s) => (
          <div key={s} style={{ width: `${((statuses[s] ?? 0) / total) * 100}%`, background: STATUS_COLOR[s] }} />
        ))}
      </div>
      <ul className="mt-5 space-y-2.5 text-sm">
        {present.map((s) => {
          const n = statuses[s] ?? 0
          return (
            <li key={s} className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                {STATUS_LABEL[s]}
              </span>
              <span className="tabular-nums text-kenza-black/70">
                {n} ({Math.round((n / total) * 100)} %)
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TopProducts({ items }: { items: DashboardOverview['top_products'] }) {
  if (items.length === 0) return <p className="text-sm text-kenza-black/60">Aucune vente terminée sur cette période.</p>
  const max = Math.max(1, ...items.map((p) => p.qty))
  return (
    <ol className="space-y-4">
      {items.map((p) => (
        <li key={p.name}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{p.name}</span>
            <span className="shrink-0 tabular-nums text-kenza-black/70">
              {p.qty} vendu{p.qty > 1 ? 's' : ''}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-kenza-black/10">
            <div className="h-full rounded-full bg-kenza-orange" style={{ width: `${(p.qty / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="h-10 w-64 rounded-lg bg-kenza-black/10" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-kenza-black/10" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-kenza-black/10" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-kenza-black/10" />
        <div className="h-64 rounded-xl bg-kenza-black/10" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [days, setDays] = useState<number>(14)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [extra, setExtra] = useState<DashboardExtra | null>(null)
  const [recent, setRecent] = useState<OrderRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const load = useCallback(async () => {
    try {
      const [o, r, e] = await Promise.all([fetchDashboardOverview(days), fetchOrders(8), fetchDashboardExtra(days).catch(() => null)])
      setOverview(o)
      setRecent(r)
      setExtra(e)
      setError(null)
      setUpdatedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le tableau de bord.')
    } finally {
      setRefreshing(false)
    }
  }, [days])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 30_000)
    return () => clearInterval(timer)
  }, [load])

  const onOrderEvent = useCallback(
    (type: 'INSERT' | 'UPDATE' | 'DELETE') => {
      if (type === 'INSERT' && soundOn) beep()
      clearTimeout(debounce.current)
      debounce.current = setTimeout(() => void load(), 600)
    },
    [load, soundOn],
  )
  const live = useOrdersRealtime(onOrderEvent)

  useEffect(() => () => clearTimeout(debounce.current), [])

  function refresh() {
    setRefreshing(true)
    void load()
  }

  if (error && !overview) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p>{error}</p>
        <button onClick={refresh} className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
          Réessayer
        </button>
      </div>
    )
  }
  if (!overview) return <Skeleton />

  const { today, yesterday } = overview
  const dateLabel = (updatedAt ?? new Date()).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Tableau de bord</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-kenza-black/60">
            <span className="capitalize">{dateLabel}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-green-600' : 'bg-kenza-black/30'}`} />
              {live ? 'En direct' : 'Actualisation toutes les 30 secondes'}
            </span>
            {updatedAt && <span>Mis à jour à {updatedAt.toLocaleTimeString('fr-FR', { timeStyle: 'short', timeZone: TZ })}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Période" className="flex overflow-hidden rounded-lg border border-kenza-black/15 bg-white">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setDays(p)} aria-pressed={days === p} className={`px-3 py-2 text-sm font-semibold ${days === p ? 'bg-kenza-orange text-white' : 'text-kenza-black/70 hover:bg-kenza-black/5'}`}>
                {p} jours
              </button>
            ))}
          </div>
          <button
            onClick={() => setSoundOn((v) => !v)}
            aria-pressed={soundOn}
            title={soundOn ? 'Désactiver le son des nouvelles commandes' : 'Activer le son des nouvelles commandes'}
            className="rounded-lg border border-kenza-black/15 bg-white p-2.5 text-kenza-black/70 hover:text-kenza-orange"
          >
            {soundOn ? <Bell size={16} /> : <BellOff size={16} />}
            <span className="sr-only">{soundOn ? 'Son activé' : 'Son désactivé'}</span>
          </button>
          <button onClick={() => exportCsv(overview.daily)} className="inline-flex items-center gap-2 rounded-lg border border-kenza-black/15 bg-white px-3 py-2 text-sm font-semibold hover:text-kenza-orange">
            <Download size={16} />
            Exporter
          </button>
          <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-kenza-black/15 bg-white px-3 py-2 text-sm font-semibold hover:text-kenza-orange disabled:opacity-60">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">La dernière actualisation a échoué, les chiffres affichés peuvent être anciens.</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Chiffre d’affaires du jour" value={formatXOF(today.revenue)} footer={<Delta now={today.revenue} before={yesterday.revenue} label="vs hier" />} />
        <Kpi label="Commandes du jour" value={String(today.orders)} footer={<Delta now={today.orders} before={yesterday.orders} label="vs hier" />} />
        <Kpi label="Panier moyen du jour" value={formatXOF(today.avg_basket)} footer={<Delta now={today.avg_basket} before={yesterday.avg_basket} label="vs hier" />} />
        <Kpi
          label="Commandes en attente"
          value={String(overview.pending)}
          highlight={overview.pending > 0}
          footer={
            <Link to="/admin/commandes" className="text-xs font-semibold text-kenza-orange hover:underline">
              {overview.pending > 0 ? 'Traiter maintenant' : 'Voir les commandes'}
            </Link>
          }
        />
      </div>

      <Card title={`Ventes des ${overview.days} derniers jours`}>
        <div className="mb-5 flex flex-wrap items-end gap-x-10 gap-y-3">
          <div>
            <p className="text-sm text-kenza-black/60">Chiffre d’affaires</p>
            <p className="text-2xl font-bold tabular-nums">{formatXOF(extra ? extra.current.revenue : overview.period_revenue)}</p>
            {extra && <Delta now={extra.current.revenue} before={extra.previous.revenue} label="vs période précédente" />}
          </div>
          <div>
            <p className="text-sm text-kenza-black/60">Commandes</p>
            <p className="text-2xl font-bold tabular-nums">{extra ? extra.current.orders : overview.period_orders}</p>
            {extra && <Delta now={extra.current.orders} before={extra.previous.orders} label="vs période précédente" />}
          </div>
        </div>
        <RevenueChart daily={overview.daily} />
        <p className="mt-3 text-xs text-kenza-black/50">Le chiffre d’affaires compte uniquement les commandes terminées. Les commandes annulées sont exclues.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Statut des commandes">
          <Statuses statuses={overview.statuses} />
        </Card>
        <Card title="Produits les plus vendus">
          <TopProducts items={overview.top_products} />
        </Card>
      </div>

      <Card
        title="Dernières commandes"
        action={
          <Link to="/admin/commandes" className="text-sm font-semibold text-kenza-orange hover:underline">
            Tout voir
          </Link>
        }
      >
        {recent.length === 0 ? (
          <p className="text-kenza-black/60">Aucune commande pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-kenza-black/10 text-xs uppercase tracking-wide text-kenza-black/50">
                  <th className="pb-3 font-medium">Référence</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Service</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 text-right font-medium">Montant</th>
                  <th className="pb-3 pl-4 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kenza-black/10">
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 font-semibold">{o.reference}</td>
                    <td className="py-3">{o.customer_name}</td>
                    <td className="py-3 text-kenza-black/70">{FULFILLMENT_LABEL[o.fulfillment_type]}</td>
                    <td className="py-3 text-kenza-black/70">{formatDateTime(o.created_at)}</td>
                    <td className="py-3 text-right font-semibold tabular-nums">{formatXOF(o.total_xof)}</td>
                    <td className="py-3 pl-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
