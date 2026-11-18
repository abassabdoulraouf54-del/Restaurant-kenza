export interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
}

export interface Product {
  id: string
  category_id: string
  name: string
  description: string
  price_xof: number
  image_url: string | null
  is_available: boolean
  is_featured: boolean
}

/** Le panier ne stocke que l'identifiant et la quantité : les prix viennent toujours de la base. */
export interface CartLine {
  productId: string
  quantity: number
}

export type Fulfillment = 'delivery' | 'pickup'

export interface RestaurantSettings {
  name: string
  description: string
  whatsapp_number: string
  phone: string | null
  email: string | null
  address: string | null
  opening_hours: string | null
  delivery_fee_xof: number
  logo_url: string | null
}

export interface OrderLineResult {
  name: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface OrderResult {
  reference: string
  subtotal: number
  delivery_fee: number
  total: number
  items: OrderLineResult[]
}

export interface CustomerInfo {
  name: string
  phone: string
  fulfillment: Fulfillment
  address: string
  notes: string
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'completed'
  | 'cancelled'

export interface OrderRow {
  id: string
  reference: string
  customer_name: string
  customer_phone: string
  fulfillment_type: Fulfillment
  delivery_address: string | null
  notes: string | null
  subtotal_xof: number
  delivery_fee_xof: number
  total_xof: number
  status: OrderStatus
  source: 'website' | 'whatsapp_manual'
  created_at: string
  order_items: { product_name: string; quantity: number }[]
}

export interface OrderItemRow {
  id: string
  product_name: string
  unit_price_xof: number
  quantity: number
  line_total_xof: number
}

export interface DashboardStats {
  total_orders: number
  today_orders: number
  revenue_xof: number
  products_count: number
  unavailable_count: number
  daily: { day: string; revenue: number; orders: number }[]
}

export interface TrackedOrder {
  reference: string
  status: OrderStatus
  created_at: string
  fulfillment_type: Fulfillment
  total: number
  items: { name: string; quantity: number }[]
}

export interface DashboardOverview {
  days: number
  today: { orders: number; revenue: number; avg_basket: number }
  yesterday: { orders: number; revenue: number; avg_basket: number }
  pending: number
  period_revenue: number
  period_orders: number
  daily: { day: string; revenue: number; orders: number }[]
  statuses: Partial<Record<OrderStatus, number>>
  top_products: { name: string; qty: number; revenue: number }[]
}

export interface PeriodTotals {
  orders: number
  revenue: number
  completed: number
  cancelled: number
}

export interface DashboardExtra {
  current: PeriodTotals
  previous: PeriodTotals
  by_hour: { hour: number; orders: number }[]
  fulfillment: Partial<Record<Fulfillment, number>>
  sources: Record<string, number>
  categories: { name: string; revenue: number }[]
}
