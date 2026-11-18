#!/usr/bin/env bash
set +e
KEY_RE='^(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sb_publishable_[A-Za-z0-9_-]+)$'
URL_RE='^https://[a-z0-9]{20}\.supabase\.co$'

echo "== Versions =="; echo "node $(node -v) / npm $(npm -v)"

echo; echo "== .env.local =="
if [ ! -f .env.local ]; then
  echo "ABSENT : creez-le (voir .env.example)"
else
  set -a; source .env.local; set +a
  [[ "$VITE_SUPABASE_URL" =~ $URL_RE ]] && echo "URL : format OK" || echo "URL : format INCORRECT (valeur d'exemple ou mal copiee)"
  [[ "$VITE_SUPABASE_ANON_KEY" =~ $KEY_RE ]] && echo "Cle : format OK" || echo "Cle : format INCORRECT (tronquee ou mauvaise cle)"

  echo; echo "== Reseau Supabase =="
  HOST="${VITE_SUPABASE_URL#https://}"; HOST="${HOST%%/*}"
  if getent hosts "$HOST" >/dev/null 2>&1; then echo "DNS OK"; else echo "DNS impossible (URL fausse, projet supprime/en pause, ou pas d'Internet)"; fi
  curl -s -m 15 -o /dev/null -w "API categories : HTTP %{http_code}\n" \
    "$VITE_SUPABASE_URL/rest/v1/categories?select=name" \
    -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
fi

echo; echo "== Fichiers du projet =="
missing=0
for f in \
  src/App.tsx src/main.tsx src/styles/index.css src/lib/supabase.ts \
  src/contexts/CartProvider.tsx src/contexts/SettingsProvider.tsx src/contexts/AuthProvider.tsx \
  src/services/catalog.ts src/services/orders.ts src/services/admin.ts src/services/settings.ts \
  src/pages/Home/Home.tsx src/pages/Menu/Menu.tsx src/pages/Cart/Cart.tsx src/pages/Checkout/Checkout.tsx \
  src/pages/About/About.tsx src/pages/Contact/Contact.tsx \
  src/pages/Admin/Login.tsx src/pages/Admin/Dashboard.tsx src/pages/Admin/Products.tsx \
  src/pages/Admin/Categories.tsx src/pages/Admin/Orders.tsx src/pages/Admin/AdminSettings.tsx \
  src/layouts/MainLayout.tsx src/layouts/AdminLayout.tsx \
  src/components/admin/ProtectedRoute.tsx src/components/admin/Modal.tsx src/components/admin/ui.ts; do
  [ -s "$f" ] || { echo "MANQUANT : $f"; missing=1; }
done
[ $missing -eq 0 ] && echo "Tous les fichiers sont presents"

echo; echo "== Build =="
npm run build 2>&1 | tail -30
