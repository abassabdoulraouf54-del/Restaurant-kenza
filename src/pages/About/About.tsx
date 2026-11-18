import { usePageMeta } from '@/hooks/usePageMeta'
import { Link } from 'react-router-dom'
import { Flame, MessageCircle, Truck } from 'lucide-react'
import { RESTAURANT } from '@/lib/constants'
import { useSettings } from '@/hooks/useSettings'

export default function About() {
  usePageMeta("À propos | Restaurant Kenza, Magaria (Niger)", "Découvrez le Restaurant Kenza, spécialiste des pintades frites et des brochettes à Magaria, région de Zinder.")
  const { settings } = useSettings()
  const name = settings?.name ?? RESTAURANT.name
  const description =
    settings?.description ||
    `${name} vous propose ses pintades frites, ses brochettes et ses boissons à ${RESTAURANT.city}. Vous pouvez commander à emporter ou en livraison, et nous transmettre votre commande directement sur WhatsApp.`

  const services = [
    { icon: Flame, title: 'Nos spécialités', text: 'Pintades frites, brochettes et boissons.' },
    { icon: Truck, title: 'Nos services', text: 'Commande à emporter ou livraison.' },
    { icon: MessageCircle, title: 'Commande WhatsApp', text: 'Envoyez votre panier au restaurant en un clic.' },
  ]

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="mt-2 text-center font-display text-4xl font-bold md:text-5xl">{name}</h1>
      <p className="mx-auto mt-8 max-w-3xl whitespace-pre-line text-center text-lg text-kenza-black/75">
        {description}
      </p>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {services.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-2xl border border-kenza-gold/30 bg-white p-6 text-center">
            <span className="inline-flex rounded-full bg-kenza-orange/10 p-3 text-kenza-orange">
              <Icon size={24} />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-kenza-black/70">{text}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link to="/menu" className="inline-block rounded-full bg-kenza-orange px-8 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-kenza-orange-dark">
          Découvrir le menu
        </Link>
      </div>
    </section>
  )
}
