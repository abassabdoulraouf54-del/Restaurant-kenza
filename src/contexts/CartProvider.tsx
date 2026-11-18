import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CartContext, type CartContextValue } from './cart-context'
import type { CartLine } from '@/types'

const STORAGE_KEY = 'kenza-cart-v1'
const MAX_QUANTITY = 50

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (l): l is CartLine =>
          !!l &&
          typeof l.productId === 'string' &&
          Number.isInteger(l.quantity) &&
          l.quantity >= 1,
      )
      .map((l) => ({ productId: l.productId, quantity: Math.min(l.quantity, MAX_QUANTITY) }))
  } catch {
    return []
  }
}

const clamp = (q: number) => Math.max(1, Math.min(MAX_QUANTITY, Math.floor(q)))

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* stockage indisponible : le panier reste en mémoire */
    }
  }, [lines])

  const add = useCallback((productId: string, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId)
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: clamp(l.quantity + quantity) } : l,
        )
      }
      return [...prev, { productId, quantity: clamp(quantity) }]
    })
  }, [])

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId))
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      setLines((prev) => prev.filter((l) => l.productId !== productId))
      return
    }
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, quantity: clamp(quantity) } : l)),
    )
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, add, setQuantity, remove, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
