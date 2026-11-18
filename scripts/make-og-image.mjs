import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g" cx="75%" cy="30%" r="70%">
      <stop offset="0" stop-color="#E8590C" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#121212" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#121212"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif">
    <text x="600" y="200" font-size="34" letter-spacing="18" fill="#C9A227">RESTAURANT</text>
    <text x="600" y="350" font-size="150" font-weight="700" fill="#FFF8EE">KENZA</text>
    <rect x="450" y="385" width="300" height="3" fill="#C9A227"/>
    <text x="600" y="460" font-size="38" fill="#FFF8EE">Pintades frites · Brochettes · Boissons</text>
    <text x="600" y="520" font-size="30" fill="#C9A227">Magaria · Zinder · Niger</text>
  </g>
</svg>`

mkdirSync('public/images', { recursive: true })
await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toFile('public/images/og-image.jpg')
console.log('Image créée : public/images/og-image.jpg (remplacez-la plus tard par une vraie photo 1200x630)')
