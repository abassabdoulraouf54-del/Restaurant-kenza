import { usePageMeta } from '@/hooks/usePageMeta'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShoppingBag } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import { useCatalog } from '@/hooks/useCatalog'
import { useCart } from '@/hooks/useCart'
import { formatXOF, normalizeText } from '@/utils/format'
import type { Product } from '@/types'

type Sort = 'default' | 'price-asc' | 'price-desc'

export default function Menu() {
  usePageMeta("Menu | Restaurant Kenza, Magaria (Niger)", "Pintades frites, brochettes et boissons du Restaurant Kenza à Magaria. Consultez les prix en FCFA et commandez sur WhatsApp.")
  const { categories, products, loading, error, retry } = useCatalog()
  const { lines, count } = useCart()

  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [sort, setSort] = useState<Sort>('default')
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c] as const)), [categories])

  const visible = useMemo(() => {
    const q = normalizeText(query.trim())
    const order = (p: Product) => categoryById.get(p.category_id)?.sort_order ?? 999
    return products
      .filter((p) => categoryId === 'all' || p.category_id === categoryId)
      .filter((p) => !onlyAvailable || p.is_available)
      .filter((p) => !q || normalizeText(`${p.name} ${p.description}`).includes(q))
      .sort((a, b) => {
        if (sort === 'price-asc') return a.price_xof - b.price_xof
        if (sort === 'price-desc') return b.price_xof - a.price_xof
        return order(a) - order(b) || a.name.localeCompare(b.name, 'fr')
      })
  }, [products, categoryById, categoryId, onlyAvailable, query, sort])

  const cartTotal = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p] as const))
    return lines.reduce((sum, l) => {
      const p = byId.get(l.productId)
      return p && p.is_available ? sum + p.price_xof * l.quantity : sum
    }, 0)
  }, [lines, products])

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition ${
      active
        ? 'border-kenza-orange bg-kenza-orange text-white'
        : 'border-kenza-gold/50 bg-white text-kenza-black hover:border-kenza-orange hover:text-kenza-orange'
    }`

  return (
    <section className="mx-auto max-w-6xl px-4 pb-28 pt-12 md:pb-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl md:text-5xl">Notre menu</h1>
        <p className="mt-4 text-kenza-black/70">
          Pintades frites, brochettes et boissons. Les prix affichés sont provisoires : le restaurant confirme le
          montant définitif à chaque commande.
        </p>
      </header>

      {/* Filtres */}
      <div className="mt-10 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Rechercher un produit</span>
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-kenza-black/40" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full rounded-full border border-kenza-gold/50 bg-white py-3 pl-11 pr-4 outline-none focus:border-kenza-orange focus:ring-2 focus:ring-kenza-orange/20"
            />
          </label>
          <label>
            <span className="sr-only">Trier</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="w-full rounded-full border border-kenza-gold/50 bg-white px-5 py-3 outline-none focus:border-kenza-orange md:w-auto"
            >
              <option value="default">Tri par défaut</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={categoryId === 'all'} onClick={() => setCategoryId('all')} className={chip(categoryId === 'all')}>
            Tout
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
              className={chip(categoryId === c.id)}
            >
              {c.name}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="h-4 w-4 accent-kenza-orange"
            />
            Disponibles uniquement
          </label>
        </div>
      </div>

      {/* Résultats */}
      <div className="mt-10" aria-live="polite">
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-kenza-black/10" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-red-800">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-full bg-kenza-orange px-6 py-2.5 font-semibold text-white hover:bg-kenza-orange-dark"
            >
              Réessayer
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="mb-4 text-sm text-kenza-black/60">
              {visible.length} produit{visible.length > 1 ? 's' : ''}
            </p>
            {visible.length === 0 ? (
              <p className="rounded-2xl bg-white p-10 text-center text-kenza-black/70">
                Aucun produit ne correspond à votre recherche.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p) => (
                  <ProductCard key={p.id} product={p} categoryName={categoryById.get(p.category_id)?.name} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Barre panier mobile */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-kenza-gold/40 bg-kenza-cream/95 p-3 backdrop-blur md:hidden">
          <Link
            to="/panier"
            className="flex items-center justify-between rounded-full bg-kenza-orange px-6 py-3.5 font-semibold text-white"
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingBag size={18} /> Voir mon panier ({count})
            </span>
            <span>{formatXOF(cartTotal)}</span>
          </Link>
        </div>
      )}
    </section>
  )
}
