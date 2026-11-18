import { usePageMeta } from '@/hooks/usePageMeta'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { RESTAURANT } from '@/lib/constants'
import { useSettings } from '@/hooks/useSettings'
import { waLink } from '@/utils/whatsapp'

export default function Contact() {
  usePageMeta("Contact | Restaurant Kenza, Magaria (Niger)", "Contactez le Restaurant Kenza à Magaria : WhatsApp, téléphone, adresse et horaires.")
  const { settings } = useSettings()
  const name = settings?.name ?? RESTAURANT.name
  const whatsapp = settings?.whatsapp_number ?? RESTAURANT.whatsappNumber
  const phoneDisplay = settings?.phone || RESTAURANT.phoneDisplay
  const telHref = `tel:+${phoneDisplay.replace(/\D/g, '')}`

  const card = 'rounded-2xl border border-kenza-gold/30 bg-white p-6'
  const iconWrap = 'inline-flex rounded-full bg-kenza-orange/10 p-3 text-kenza-orange'

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="mt-2 text-center font-display text-4xl font-bold md:text-5xl">Nous contacter</h1>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <article className={card}>
          <span className={iconWrap}><MapPin size={22} /></span>
          <h2 className="mt-4 font-display text-lg font-semibold">Adresse</h2>
          <p className="mt-2 text-kenza-black/75">{settings?.address || RESTAURANT.city}</p>
          {!settings?.address && (
            <p className="mt-1 text-sm text-kenza-black/55">
              L’adresse précise sera bientôt disponible. Contactez-nous sur WhatsApp.
            </p>
          )}
        </article>

        <article className={card}>
          <span className={iconWrap}><Clock size={22} /></span>
          <h2 className="mt-4 font-display text-lg font-semibold">Horaires</h2>
          {settings?.opening_hours ? (
            <p className="mt-2 whitespace-pre-line text-kenza-black/75">{settings.opening_hours}</p>
          ) : (
            <p className="mt-2 text-kenza-black/55">Horaires bientôt disponibles. Contactez-nous sur WhatsApp.</p>
          )}
        </article>

        <article className={card}>
          <span className={iconWrap}><Phone size={22} /></span>
          <h2 className="mt-4 font-display text-lg font-semibold">Téléphone</h2>
          <a href={telHref} className="mt-2 inline-block text-kenza-black/75 hover:text-kenza-orange">
            {phoneDisplay}
          </a>
        </article>

        {settings?.email && (
          <article className={card}>
            <span className={iconWrap}><Mail size={22} /></span>
            <h2 className="mt-4 font-display text-lg font-semibold">E-mail</h2>
            <a href={`mailto:${settings.email}`} className="mt-2 inline-block break-all text-kenza-black/75 hover:text-kenza-orange">
              {settings.email}
            </a>
          </article>
        )}
      </div>

      <div className="mt-12 rounded-2xl bg-kenza-black p-8 text-center text-kenza-cream">
        <h2 className="font-display text-2xl font-semibold text-kenza-gold">Une question ? Écrivez-nous</h2>
        <p className="mt-2 text-kenza-cream/70">Le moyen le plus rapide de joindre {name} est WhatsApp.</p>
        <a
          href={waLink(whatsapp, `Bonjour ${name} !`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-3.5 font-semibold text-kenza-black transition hover:-translate-y-0.5"
        >
          <MessageCircle size={20} /> Écrire sur WhatsApp
        </a>
      </div>
    </section>
  )
}
