import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Variables Supabase manquantes dans .env.local')
  process.exit(1)
}
try {
  const r = await fetch(`${url}/rest/v1/`, { headers: { apikey: key } })
  if (r.status >= 500) throw new Error(`HTTP ${r.status}`)
} catch (e) {
  console.error(`Supabase injoignable (${e.cause?.code ?? e.message}).`)
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })
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

const FAKE_ID = '00000000-0000-4000-8000-000000000000'
const base = { p_name: 'Test Securite', p_phone: '+22796000000', p_fulfillment: 'pickup', p_address: null, p_notes: null }

await check('Visiteur : statistiques admin refusées', async () => {
  const { data, error } = await sb.rpc('admin_dashboard_stats')
  return [!!error && !data, error?.code]
})

await check('Visiteur : saisie manuelle de commande refusée', async () => {
  const { data, error } = await sb.rpc('admin_create_order', { ...base, p_items: [{ product_id: FAKE_ID, quantity: 1 }] })
  return [!!error && !data, error?.code]
})

await check('Visiteur : is_admin() renvoie false', async () => {
  const { data, error } = await sb.rpc('is_admin')
  return [!error && data === false, String(data)]
})

await check('Commande avec un produit inexistant refusée', async () => {
  const { error } = await sb.rpc('create_order', { ...base, p_items: [{ product_id: FAKE_ID, quantity: 1 }] })
  return [error?.message?.includes('Produit indisponible'), error?.message]
})

await check('Commande avec identifiant produit invalide refusée', async () => {
  const { data, error } = await sb.rpc('create_order', { ...base, p_items: [{ product_id: "1'; drop table orders; --", quantity: 1 }] })
  return [!!error && !data, error?.message?.slice(0, 60)]
})

await check('Quantité excessive refusée', async () => {
  const { data: products } = await sb.from('products').select('id').eq('is_available', true).limit(1)
  const { error } = await sb.rpc('create_order', { ...base, p_items: [{ product_id: products[0].id, quantity: 51 }] })
  return [error?.message?.includes('Quantité invalide'), error?.message]
})

await check('Nom trop long refusé', async () => {
  const { error } = await sb.rpc('create_order', { ...base, p_name: 'x'.repeat(101), p_items: [{ product_id: FAKE_ID, quantity: 1 }] })
  return [error?.message?.includes('Nom invalide'), error?.message]
})

await check('Visiteur : aucune commande lisible', async () => {
  const { data, error } = await sb.from('orders').select('id').limit(1)
  return [!error && data.length === 0, '']
})

await check('Visiteur : suppression de produit sans effet', async () => {
  const { data } = await sb.from('products').delete().neq('id', FAKE_ID).select('id')
  const { data: after } = await sb.from('products').select('id')
  return [(data?.length ?? 0) === 0 && after.length > 0, `${after.length} produits toujours présents`]
})

await check('Suivi : référence/téléphone inconnus, aucune donnée', async () => {
  const { data, error } = await sb.rpc('track_order', { p_reference: 'KZ-000000-0000', p_phone: '+22700000000' })
  return [!error && data === null, '']
})

console.log(failures === 0 ? '\nTous les tests de sécurité passent.' : `\n${failures} test(s) en échec.`)
process.exit(failures === 0 ? 0 : 1)
