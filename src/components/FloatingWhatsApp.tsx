import { useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { RESTAURANT } from '@/lib/constants'
import { useSettings } from '@/hooks/useSettings'
import { waLink } from '@/utils/whatsapp'

export default function FloatingWhatsApp() {
  const { settings } = useSettings()
  const { pathname } = useLocation()
  if (pathname.startsWith('/commander')) return null

  const name = settings?.name ?? RESTAURANT.name
  const number = settings?.whatsapp_number ?? RESTAURANT.whatsappNumber

  return (
    <a
      href={waLink(number, `Bonjour ${name} !`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Écrire au restaurant sur WhatsApp"
      className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-kenza-black shadow-lg transition hover:scale-105 md:bottom-6 md:right-6"
    >
      <MessageCircle size={26} />
    </a>
  )
}
