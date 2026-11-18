export function formatXOF(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`
}

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Africa/Niamey',
  })
}
