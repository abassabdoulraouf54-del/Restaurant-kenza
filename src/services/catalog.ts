import { supabase } from '@/lib/supabase'
import type { Category, Product } from '@/types'

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, category_id, name, description, price_xof, image_url, is_available, is_featured')
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}
