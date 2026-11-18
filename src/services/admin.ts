import { supabase } from '@/lib/supabase'
import { slugify } from '@/utils/format'
import { compressImage } from '@/utils/image'
import type {
  Category,
  CustomerInfo,
  DashboardExtra,
  DashboardOverview,
  DashboardStats,
  OrderItemRow,
  OrderResult,
  OrderRow,
  OrderStatus,
  Product,
  RestaurantSettings,
} from '@/types'

const BUCKET = 'kenza-media'
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const MAX_SOURCE_BYTES = 10 * 1024 * 1024
// SVG volontairement refusé (risque de scripts embarqués)
const IMAGE_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/* ---------- Images ---------- */

export async function uploadImage(original: File, folder: 'products' | 'branding'): Promise<string> {
  if (!IMAGE_EXT[original.type]) throw new Error('Format non accepté (JPG, PNG ou WebP uniquement).')
  if (original.size > MAX_SOURCE_BYTES) throw new Error('Image trop lourde (10 Mo maximum).')
  const file = await compressImage(original)
  const ext = IMAGE_EXT[file.type] as string | undefined
  if (!ext) throw new Error('Format non accepté (JPG, PNG ou WebP uniquement).')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image trop lourde, même après compression.')
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000' })
  if (error) throw new Error('L’envoi de l’image a échoué.')
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function removeImage(url: string | null): Promise<void> {
  if (!url) return
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return
  try {
    await supabase.storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))])
  } catch {
    /* suppression d'image : au mieux, sans bloquer */
  }
}

/* ---------- Produits ---------- */

export interface ProductInput {
  name: string
  description: string
  price_xof: number
  category_id: string
  is_available: boolean
  is_featured: boolean
  image_url: string | null
}

export async function saveProduct(input: ProductInput, id?: string): Promise<void> {
  if (id) {
    const { data, error } = await supabase.from('products').update(input).eq('id', id).select('id')
    if (error || !data || data.length === 0) throw new Error('Modification du produit refusée.')
  } else {
    const { data, error } = await supabase.from('products').insert(input).select('id')
    if (error || !data || data.length === 0) throw new Error('Création du produit refusée.')
  }
}

export async function patchProduct(
  id: string,
  patch: { is_available?: boolean; is_featured?: boolean },
): Promise<void> {
  const { data, error } = await supabase.from('products').update(patch).eq('id', id).select('id')
  if (error || !data || data.length === 0) throw new Error('Modification refusée.')
}

export async function deleteProduct(product: Product): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', product.id)
  if (error) throw new Error('Suppression impossible.')
  await removeImage(product.image_url)
}

/* ---------- Catégories ---------- */

export async function saveCategory(name: string, opts: { id?: string; sortOrder?: number }): Promise<void> {
  const clean = name.trim()
  if (clean.length < 2 || clean.length > 60) throw new Error('Nom invalide (2 à 60 caractères).')
  const slug = slugify(clean)
  if (!slug) throw new Error('Nom invalide.')

  const res = opts.id
    ? await supabase.from('categories').update({ name: clean, slug }).eq('id', opts.id).select('id')
    : await supabase.from('categories').insert({ name: clean, slug, sort_order: opts.sortOrder ?? 0 }).select('id')

  if (res.error) {
    throw new Error(res.error.code === '23505' ? 'Une catégorie du même nom existe déjà.' : 'Enregistrement refusé.')
  }
  if (!res.data || res.data.length === 0) throw new Error('Enregistrement refusé.')
}

export async function reorderCategories(ordered: Category[]): Promise<void> {
  const results = await Promise.all(
    ordered.map((c, i) => supabase.from('categories').update({ sort_order: i + 1 }).eq('id', c.id)),
  )
  if (results.some((r) => r.error)) throw new Error('Réorganisation impossible.')
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) {
    throw new Error(
      error.code === '23503'
        ? 'Cette catégorie contient encore des produits : déplacez-les ou supprimez-les d’abord.'
        : 'Suppression impossible.',
    )
  }
}

/* ---------- Commandes ---------- */

export async function fetchOrders(limit = 300): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, reference, customer_name, customer_phone, fulfillment_type, delivery_address, notes, subtotal_xof, delivery_fee_xof, total_xof, status, source, created_at, order_items(product_name, quantity)',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error('Chargement des commandes impossible.')
  return (data ?? []) as unknown as OrderRow[]
}

export async function fetchOrderItems(orderId: string): Promise<OrderItemRow[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('id, product_name, unit_price_xof, quantity, line_total_xof')
    .eq('order_id', orderId)
  if (error) throw new Error('Articles indisponibles.')
  return (data ?? []) as OrderItemRow[]
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select('id')
  if (error || !data || data.length === 0) throw new Error('Changement de statut refusé.')
}

export async function adminCreateOrder(
  customer: CustomerInfo,
  lines: { productId: string; quantity: number }[],
): Promise<OrderResult> {
  const { data, error } = await supabase.rpc('admin_create_order', {
    p_name: customer.name,
    p_phone: customer.phone,
    p_fulfillment: customer.fulfillment,
    p_address: customer.fulfillment === 'delivery' ? customer.address : null,
    p_notes: customer.notes || null,
    p_items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
  })
  if (error) throw new Error(error.code === 'P0001' ? error.message : 'Enregistrement impossible.')
  return data as OrderResult
}

/* ---------- Tableau de bord et paramètres ---------- */

export async function fetchDashboard(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('admin_dashboard_stats')
  if (error) throw new Error('Statistiques indisponibles.')
  return data as DashboardStats
}

export async function updateSettings(s: RestaurantSettings): Promise<void> {
  const { data, error } = await supabase.from('restaurant_settings').update(s).eq('id', 1).select('id')
  if (error || !data || data.length === 0) throw new Error('Enregistrement des paramètres refusé.')
}

export async function fetchDashboardOverview(days: number): Promise<DashboardOverview> {
  const { data, error } = await supabase.rpc('admin_dashboard_overview', { p_days: days })
  if (error) {
    console.error('admin_dashboard_overview', error)
    throw new Error(`Statistiques indisponibles (${error.code ?? 'sans code'} : ${error.message})`)
  }
  return data as DashboardOverview
}

export async function fetchDashboardExtra(days: number): Promise<DashboardExtra> {
  const { data, error } = await supabase.rpc('admin_dashboard_extra', { p_days: days })
  if (error) throw new Error(`Statistiques avancées indisponibles (${error.code ?? 'sans code'})`)
  return data as DashboardExtra
}
