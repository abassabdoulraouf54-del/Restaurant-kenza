import { createClient } from '@supabase/supabase-js'

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env
if (!url || !key || !email || !password) {
  console.error('Variables manquantes (URL, clé, ADMIN_EMAIL ou ADMIN_PASSWORD).')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const PHONE = '+22700000000'
const created = []
let failures = 0

async function check(label, fn) {
  try {
    const [ok, detail] = await fn()
    console.log(`${ok ? 'OK    ' : 'ÉCHEC '} ${label}${detail ? ` (${detail})` : ''}`)
    if (!ok) failures++
  } catch (e) {
    console.log(`ÉCHEC  ${label} (exception : ${e.message})`)
    failures++
  }
}

const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: email.trim(), password })
if (authErr) {
  console.error(`Connexion impossible : ${authErr.message}`)
  process.exit(1)
}

const { data: product } = await sb.from('products').select('id, price_xof').eq('is_available', true).limit(1).single()
const { data: settings } = await sb.from('restaurant_settings').select('delivery_fee_xof').eq('id', 1).single()

async function place(fn, fulfillment) {
  const { data, error } = await sb.rpc(fn, {
    p_name: 'TEST Securite',
    p_phone: PHONE,
    p_fulfillment: fulfillment,
    p_address: fulfillment === 'delivery' ? 'Adresse de test, Magaria' : null,
    p_notes: 'test automatique',
    // Prix falsifiés volontairement : la base doit les ignorer
    p_items: [{ product_id: product.id, quantity: 2, price_xof: 1, unit_price: 1, line_total: 1 }],
  })
  if (error) throw new Error(error.message)
  const { data: row } = await sb.from('orders').select('id, source').eq('reference', data.reference).single()
  created.push(row.id)
  return { result: data, row }
}

const before = await sb.rpc('admin_dashboard_stats')

await check('Compte admin reconnu', async () => {
  const { data } = await sb.from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
  return [data?.role === 'admin', `rôle : ${data?.role}`]
})

await check('Statistiques admin accessibles', async () => {
  const { data, error } = await sb.rpc('admin_dashboard_stats')
  return [!error && typeof data?.total_orders === 'number', error?.message]
})

await check('Prix falsifié ignoré (sous-total = prix de la base × quantité)', async () => {
  const { result } = await place('create_order', 'pickup')
  const expected = product.price_xof * 2
  return [result.subtotal === expected && result.items[0].unit_price === product.price_xof, `${result.subtotal} attendu ${expected}`]
})

await check('Retrait : frais de livraison à 0', async () => {
  const { result } = await place('create_order', 'pickup')
  return [result.delivery_fee === 0, String(result.delivery_fee)]
})

await check('Livraison : frais lus dans les paramètres', async () => {
  const { result } = await place('create_order', 'delivery')
  return [result.delivery_fee === settings.delivery_fee_xof && result.total === result.subtotal + result.delivery_fee, `${result.delivery_fee} FCFA`]
})

await check('Saisie manuelle : origine « whatsapp_manual »', async () => {
  const { row } = await place('admin_create_order', 'pickup')
  return [row.source === 'whatsapp_manual', row.source]
})

await check('Commandes en attente exclues du chiffre d’affaires', async () => {
  const after = await sb.rpc('admin_dashboard_stats')
  return [after.data.revenue_xof === before.data.revenue_xof, `${after.data.revenue_xof} FCFA`]
})

await check('Suivi client : bon couple référence/téléphone seulement', async () => {
  const { result } = await place('create_order', 'pickup')
  const good = await sb.rpc('track_order', { p_reference: result.reference, p_phone: PHONE })
  const bad = await sb.rpc('track_order', { p_reference: result.reference, p_phone: '+22799999999' })
  return [good.data?.status === 'pending' && bad.data === null, `statut : ${good.data?.status}`]
})

// Nettoyage
if (created.length > 0) {
  const { error } = await sb.from('orders').delete().in('id', created)
  console.log(error ? `ATTENTION : suppression des commandes de test impossible (${error.message})` : `Nettoyage : ${created.length} commandes de test supprimées`)
}
await sb.from('customers').delete().eq('phone', PHONE)
await sb.auth.signOut()

console.log(failures === 0 ? '\nTous les tests administrateur passent.' : `\n${failures} test(s) en échec.`)
process.exit(failures === 0 ? 0 : 1)
