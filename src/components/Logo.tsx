import { useSettings } from '@/hooks/useSettings'

type Props = { variant?: 'dark' | 'light'; className?: string }

export default function Logo({ variant = 'dark', className = '' }: Props) {
  const { settings } = useSettings()
  const isDark = variant === 'dark'

  if (settings?.logo_url) {
    return (
      <img
        src={settings.logo_url}
        alt={settings.name}
        height={48}
        className={`h-12 w-auto max-w-[180px] object-contain ${className}`}
      />
    )
  }

  return (
    <span className={`inline-flex items-center gap-3 ${className}`} aria-label="Restaurant Kenza">
      <span className={`font-display text-4xl leading-none ${isDark ? 'text-kenza-black' : 'text-kenza-cream'}`}>
        Kenza
      </span>
      <span className="h-9 w-px bg-kenza-gold" aria-hidden="true" />
      <span className={`flex flex-col text-[0.7rem] leading-tight ${isDark ? 'text-kenza-black/70' : 'text-kenza-cream/70'}`}>
        <span className="font-semibold tracking-wide">Restaurant</span>
        <span>Magaria, Niger</span>
      </span>
    </span>
  )
}
