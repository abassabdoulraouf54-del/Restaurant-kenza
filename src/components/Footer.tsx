import { Link } from 'react-router-dom'
import Logo from './Logo'
import { RESTAURANT } from '@/lib/constants'
import { useSettings } from '@/hooks/useSettings'
import { waLink } from '@/utils/whatsapp'

export default function Footer() {
  const { settings } = useSettings()
  const name = settings?.name ?? RESTAURANT.name
  const whatsapp = settings?.whatsapp_number ?? RESTAURANT.whatsappNumber
  const phone = settings?.phone || RESTAURANT.phoneDisplay
  const address = settings?.address || RESTAURANT.city

  const h = 'font-display text-lg text-kenza-cream'
  const link = 'text-kenza-cream/75 underline-offset-4 hover:text-kenza-cream hover:underline'

  return (
    <footer className="bg-kenza-black text-kenza-cream">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-[1.2fr_0.8fr_1fr]">
        <div>
          <Logo variant="light" />
          <p className="mt-5 max-w-xs text-sm text-kenza-cream/70">
            Pintades frites, brochettes et boissons, à emporter ou livrées. Commande directe sur WhatsApp.
          </p>
        </div>

        <div>
          <h2 className={h}>Navigation</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link className={link} to="/menu">Menu</Link></li>
            <li><Link className={link} to="/panier">Panier</Link></li>
            <li><Link className={link} to="/suivi">Suivre ma commande</Link></li>
            <li><Link className={link} to="/a-propos">À propos</Link></li>
            <li><Link className={link} to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h2 className={h}>Nous trouver</h2>
          <dl className="mt-4 space-y-3 text-sm text-kenza-cream/75">
            <div>
              <dt className="text-kenza-gold">Adresse</dt>
              <dd>{address}</dd>
            </div>
            {settings?.opening_hours && (
              <div>
                <dt className="text-kenza-gold">Horaires</dt>
                <dd className="whitespace-pre-line">{settings.opening_hours}</dd>
              </div>
            )}
            <div>
              <dt className="text-kenza-gold">WhatsApp</dt>
              <dd>
                <a href={waLink(whatsapp)} target="_blank" rel="noopener noreferrer" className={link}>
                  {phone}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-kenza-cream/55">
        © {new Date().getFullYear()} {name}. Tous droits réservés. Réalisé par AR Digital Studio.
      </div>
    </footer>
  )
}
