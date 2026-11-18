import { existsSync, readFileSync, writeFileSync } from 'node:fs'

function readEnvFile() {
  if (!existsSync('.env.local')) return {}
  const out = {}
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const site = (process.env.VITE_SITE_URL || readEnvFile().VITE_SITE_URL || '').replace(/\/+$/, '')
if (!/^https?:\/\/\S+$/.test(site)) {
  console.error('VITE_SITE_URL manquant ou invalide (ex. https://mon-site.netlify.app).')
  process.exit(1)
}
if (site.includes('localhost')) {
  console.warn('Attention : VITE_SITE_URL pointe vers localhost. Utilisez l’adresse publique pour un build de production.')
}

const pages = ['/', '/menu', '/a-propos', '/contact']
const today = new Date().toISOString().slice(0, 10)

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${site}${p === '/' ? '/' : p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`
const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /panier
Disallow: /commander
Disallow: /suivi

Sitemap: ${site}/sitemap.xml
`

writeFileSync('public/sitemap.xml', sitemap)
writeFileSync('public/robots.txt', robots)
console.log(`SEO : sitemap.xml et robots.txt générés pour ${site}`)
