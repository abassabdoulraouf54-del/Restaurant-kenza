import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key || url.includes('VOTRE')) {
  console.error('Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local')
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

let firstCategory, firstProduct, settings

await check('Connexion + lecture publique des catégories', async () => {
  const { data, error } = await sb.from('categories').select('id, name').order('sort_order')
  firstCategory = data?.[0]
  return [!error && data.length > 0, error?.message ?? `${data.length} catégories`]
})

await check('Lecture publique des produits', async () => {
  const { data, error } = await sb.from('products').select('id, price_xof')
  firstProduct = data?.[0]
  return [!error && data.length > 0, error?.message ?? `${data.length} produits`]
})

await check('Lecture publique des paramètres', async () => {
  const { data, error } = await sb.from('restaurant_settings').select('name, whatsapp_number').eq('id', 1).single()
  settings = data
  return [!error && !!data, error?.message ?? `WhatsApp : ${data?.whatsapp_number}`]
})

for (const table of ['orders', 'order_items', 'customers', 'profiles']) {
  await check(`Table « ${table} » invisible pour un visiteur`, async () => {
    const { data, error } = await sb.from(table).select('*').limit(1)
    return [!error && data.length === 0, error?.message]
  })
}

await check('Un visiteur ne peut PAS créer de produit', async () => {
  const { error } = await sb.from('products').insert({ category_id: firstCategory.id, name: '__test_securite__', price_xof: 1 })
  return [!!error, error ? error.code : 'ALERTE : insertion acceptée !']
})

await check('Un visiteur ne peut PAS modifier un produit', async () => {
  const { data, error } = await sb.from('products').update({ price_xof: firstProduct.price_xof }).eq('id', firstProduct.id).select()
  return [!!error || data.length === 0, 'aucune ligne modifiée']
})

await check('Un visiteur ne peut PAS modifier les paramètres', async () => {
  const { data, error } = await sb.from('restaurant_settings').update({ name: settings.name }).eq('id', 1).select()
  return [!!error || data.length === 0, 'aucune ligne modifiée']
})

await check('Un visiteur ne peut PAS créer de catégorie', async () => {
  const { error } = await sb.from('categories').insert({ name: '__test__', slug: '__test__' })
  return [!!error, error ? error.code : 'ALERTE : insertion acceptée !']
})

await check('create_order refuse un panier vide', async () => {
  const { error } = await sb.rpc('create_order', {
    p_name: 'Test Sécurité', p_phone: '+22796000000', p_fulfillment: 'pickup',
    p_address: null, p_notes: null, p_items: [],
  })
  return [error?.message?.includes('Panier invalide'), error?.message]
})

await check('create_order refuse un téléphone invalide', async () => {
  const { error } = await sb.rpc('create_order', {
    p_name: 'Test Sécurité', p_phone: 'abc', p_fulfillment: 'pickup',
    p_address: null, p_notes: null, p_items: [{ product_id: firstProduct.id, quantity: 1 }],
  })
  return [error?.message?.includes('Téléphone invalide'), error?.message]
})

await check('create_order refuse une livraison sans adresse', async () => {
  const { error } = await sb.rpc('create_order', {
    p_name: 'Test Sécurité', p_phone: '+22796000000', p_fulfillment: 'delivery',
    p_address: '', p_notes: null, p_items: [{ product_id: firstProduct.id, quantity: 1 }],
  })
  return [error?.message?.includes('Adresse de livraison requise'), error?.message]
})

await check('Un visiteur ne peut PAS envoyer de fichier (Storage)', async () => {
  const { error } = await sb.storage.from('kenza-media').upload(`__test__/${Date.now()}.txt`, new Blob(['test']))
  return [!!error, error ? error.message : 'ALERTE : envoi accepté !']
})

console.log(failures === 0 ? '\nTous les tests passent.' : `\n${failures} test(s) en échec : à corriger avant de continuer.`)
process.exit(failures === 0 ? 0 : 1)
