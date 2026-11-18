import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/hooks/useCart'

export default function CartButton() {
  const { count } = useCart()
  return (
    <Link
      to="/panier"
      aria-label={`Voir le panier, ${count} article${count > 1 ? 's' : ''}`}
      className="relative rounded-full p-2 text-kenza-black transition-colors hover:bg-kenza-orange/10 hover:text-kenza-orange"
    >
      <ShoppingBag size={22} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-kenza-orange px-1 text-[0.7rem] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
