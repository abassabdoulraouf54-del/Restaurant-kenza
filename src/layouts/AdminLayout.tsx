import { useEffect, useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  Settings as SettingsIcon,
  Tags,
} from 'lucide-react'
import Logo from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import { usePendingOrders } from '@/hooks/usePendingOrders'

const nav = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/produits', label: 'Produits', icon: Package, end: false },
  { to: '/admin/categories', label: 'Catégories', icon: Tags, end: false },
  { to: '/admin/commandes', label: 'Commandes', icon: ClipboardList, end: false },
  { to: '/admin/parametres', label: 'Paramètres', icon: SettingsIcon, end: false },
]

function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
    setTimeout(() => void ctx.close(), 400)
  } catch {
    /* son indisponible : sans conséquence */
  }
}

export default function AdminLayout() {
  const { session, signOut } = useAuth()
  const pending = usePendingOrders()
  const previous = useRef<number | null>(null)

  // L'admin ne doit pas être indexé par les moteurs de recherche
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  // Titre de l'onglet et bip à l'arrivée d'une nouvelle commande
  useEffect(() => {
    if (pending === null) return
    if (previous.current !== null && pending > previous.current) beep()
    previous.current = pending
    document.title = pending > 0 ? `(${pending}) Commandes en attente | Admin Kenza` : 'Admin | Restaurant Kenza'
  }, [pending])

  return (
    <div className="min-h-screen bg-stone-100 md:flex">
      <aside className="bg-kenza-black text-kenza-cream md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        <div className="flex items-center justify-between p-4">
          <Logo variant="light" />
          <div className="flex gap-2 md:hidden">
            <a href="/" aria-label="Voir le site" className="rounded-full p-2 hover:bg-white/10">
              <ExternalLink size={18} />
            </a>
            <button type="button" onClick={() => void signOut()} aria-label="Se déconnecter" className="rounded-full p-2 hover:bg-white/10">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <nav aria-label="Administration" className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-kenza-orange text-white' : 'text-kenza-cream/80 hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} /> {label}
              {to === '/admin/commandes' && (pending ?? 0) > 0 && (
                <span
                  className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-kenza-orange"
                  aria-label={`${pending} commande${(pending ?? 0) > 1 ? 's' : ''} en attente`}
                >
                  {pending}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-white/10 p-4 text-sm md:block">
          <p className="truncate text-kenza-cream/60">{session?.user.email}</p>
          <a href="/" className="mt-3 flex items-center gap-2 text-kenza-cream/80 hover:text-kenza-orange">
            <ExternalLink size={16} /> Voir le site
          </a>
          <button type="button" onClick={() => void signOut()} className="mt-2 flex items-center gap-2 text-kenza-cream/80 hover:text-kenza-orange">
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  )
}
