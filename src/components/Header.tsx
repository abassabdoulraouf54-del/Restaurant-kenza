import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from './Logo'
import CartButton from './CartButton'

const links = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/menu', label: 'Menu', end: false },
  { to: '/a-propos', label: 'À propos', end: false },
  { to: '/suivi', label: 'Suivi', end: false },
  { to: '/contact', label: 'Contact', end: false },
]

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `relative py-1 text-[0.95rem] font-medium transition-colors hover:text-kenza-orange ${
    isActive
      ? 'text-kenza-orange after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-kenza-orange'
      : 'text-kenza-black'
  }`

export default function Header() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-50 border-b border-kenza-black/10 bg-kenza-cream/95 backdrop-blur">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4">
        <Link to="/" onClick={close} aria-label="Restaurant Kenza, accueil">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={desktopLink}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CartButton />
          <Link to="/menu" className="btn btn-primary hidden md:inline-flex">
            Commander
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="rounded-full p-2 md:hidden"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Navigation mobile"
          className="border-t border-kenza-black/10 bg-kenza-cream px-4 pb-6 pt-3 md:hidden"
        >
          <ul>
            {links.map((l) => (
              <li key={l.to} className="border-b border-kenza-black/10">
                <NavLink
                  to={l.to}
                  end={l.end}
                  onClick={close}
                  className={({ isActive }) =>
                    `block py-3.5 font-display text-2xl ${isActive ? 'text-kenza-orange' : 'text-kenza-black'}`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <Link to="/menu" onClick={close} className="btn btn-primary mt-5 w-full">
            Commander
          </Link>
        </nav>
      )}
    </header>
  )
}
