export const RESTAURANT = {
  name: 'Restaurant Kenza',
  city: 'Magaria, région de Zinder, Niger',
  whatsappNumber: '22796953233',
  phoneDisplay: '+227 96 95 32 33',
} as const

export const whatsappLink = (message?: string) =>
  `https://wa.me/${RESTAURANT.whatsappNumber}` +
  (message ? `?text=${encodeURIComponent(message)}` : '')
