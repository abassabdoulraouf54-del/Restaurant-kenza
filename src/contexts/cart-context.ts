import { createContext } from 'react'
import type { CartLine } from '@/types'

export interface CartContextValue {
  lines: CartLine[]
  count: number
  add: (productId: string, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)
