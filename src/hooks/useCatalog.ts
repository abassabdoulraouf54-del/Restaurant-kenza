import { useEffect, useState } from 'react'
import { fetchCategories, fetchProducts } from '@/services/catalog'
import type { Category, Product } from '@/types'

interface CatalogState {
  categories: Category[]
  products: Product[]
  loading: boolean
  error: string | null
}

export function useCatalog() {
  const [state, setState] = useState<CatalogState>({
    categories: [],
    products: [],
    loading: true,
    error: null,
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchCategories(), fetchProducts()])
      .then(([categories, products]) => {
        if (!cancelled) setState({ categories, products, loading: false, error: null })
      })
      .catch(() => {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: 'Impossible de charger le menu pour le moment. Vérifiez votre connexion et réessayez.',
          }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const retry = () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    setReloadKey((k) => k + 1)
  }

  return { ...state, retry }
}
