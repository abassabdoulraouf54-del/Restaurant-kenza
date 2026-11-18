import { useEffect, useState } from 'react'
import { Check, Plus, UtensilsCrossed } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatXOF } from '@/utils/format'
import type { Product } from '@/types'

interface Props {
  product: Product
  categoryName?: string
}

export default function ProductCard({ product, categoryName }: Props) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 1200)
    return () => clearTimeout(t)
  }, [added])

  const handleAdd = () => {
    add(product.id)
    setAdded(true)
  }

  return (
    <article className="flex flex-col border border-kenza-black/15 bg-white">
      <div className="relative aspect-[4/3] overflow-hidden bg-kenza-black">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            width={640}
            height={480}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-kenza-gold/60">
            <UtensilsCrossed size={40} strokeWidth={1.5} />
          </div>
        )}
        {!product.is_available && (
          <span className="absolute left-0 top-4 bg-kenza-black px-3 py-1 text-xs font-semibold text-kenza-cream">
            Indisponible
          </span>
        )}
        {product.is_featured && product.is_available && (
          <span className="absolute left-0 top-4 bg-kenza-gold px-3 py-1 text-xs font-semibold text-kenza-black">
            Populaire
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {categoryName && <p className="text-sm text-kenza-black/60">{categoryName}</p>}
        <h3 className="mt-0.5 font-display text-2xl">{product.name}</h3>
        <p className="mt-2 flex-1 text-sm text-kenza-black/70">{product.description}</p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-kenza-black/10 pt-4">
          <span className="text-lg font-bold tabular-nums">{formatXOF(product.price_xof)}</span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!product.is_available}
            aria-label={`Ajouter ${product.name} au panier`}
            className="btn btn-primary !px-4 !py-2.5 !text-sm disabled:cursor-not-allowed disabled:!bg-kenza-black/15 disabled:!text-kenza-black/50"
          >
            {added ? <Check size={16} /> : <Plus size={16} />}
            {added ? 'Ajouté' : 'Ajouter'}
          </button>
        </div>
      </div>
    </article>
  )
}
