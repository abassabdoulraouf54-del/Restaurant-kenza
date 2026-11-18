# Restaurant Kenza

Plateforme web de restauration et de commande en ligne du Restaurant Kenza (Magaria, région de Zinder, Niger).
Réalisée par AR Digital Studio.

## Fonctionnalités

- Site public : accueil, menu avec recherche, filtres et tri, panier persistant, validation de commande, pages À propos et Contact.
- Commande : l'envoi ouvre WhatsApp avec un message formaté. La commande est aussi enregistrée en base avec une référence `KZ-AAMMJJ-NNNN` et le statut « En attente ». Le site ne confirme jamais une commande : c'est le restaurant qui la valide.
- Administration (`/admin`) : tableau de bord, produits (photos, prix, disponibilité, vedette), catégories (ordre), commandes (statuts, contact WhatsApp, saisie manuelle), paramètres (nom, WhatsApp, adresse, horaires, frais de livraison, logo).
- Prix : les prix de départ sont provisoires et modifiables dans l'administration.

## Technologies

React, TypeScript, Vite, Tailwind CSS 4, React Router, Lucide React, Supabase (PostgreSQL, Auth, Storage).

## Installation

Prérequis : Node.js 20 ou plus et un projet Supabase.

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs
npm run dev
```

Variables d'environnement (`.env.local`) :

| Variable | Rôle |
| --- | --- |
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anon / publishable |
| `VITE_SITE_URL` | Adresse publique du site (SEO, sitemap) |

Ne jamais utiliser la clé `service_role` dans le frontend.

## Base de données

Le schéma (tables, contraintes, index, politiques RLS, fonctions, stockage) et les données de départ sont dans `supabase/migrations/` et `supabase/seed.sql`. Exécutez-les dans l'éditeur SQL de Supabase, dans l'ordre des fichiers.

Principes de sécurité :

- RLS activé sur toutes les tables. Le public ne peut lire que les catégories, produits et paramètres.
- Les commandes passent uniquement par la fonction `create_order` : le navigateur envoie des identifiants de produits et des quantités, jamais des prix. Les montants sont recalculés par la base.
- Les lignes de commande conservent le nom et le prix du produit au moment de la commande.
- Limitation du nombre de commandes par numéro et au total sur 10 minutes.
- Le chiffre d'affaires ne compte que les commandes « Terminée ».

## Créer l'administrateur

1. Supabase : Authentication > Users > Add user (Auto Confirm User). Désactiver les inscriptions publiques.
2. Éditeur SQL :

```sql
insert into public.profiles (id, role)
select id, 'admin' from auth.users where email = 'VOTRE_EMAIL'
on conflict (id) do update set role = 'admin';
```

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (génère aussi sitemap.xml et robots.txt) |
| `npm run preview` | Aperçu du build |
| `npm run check:supabase` | Tests de connexion et de lecture/écriture publique |
| `npm run check:security` | Tests de sécurité côté visiteur |
| `npm run test:admin` | Tests côté administrateur (nécessite `ADMIN_EMAIL` et `ADMIN_PASSWORD`) |

## Déploiement (Netlify)

```bash
npx netlify-cli login
npx netlify-cli sites:create --name NOM-DU-SITE
VITE_SITE_URL="https://NOM-DU-SITE.netlify.app" npm run build
npx netlify-cli deploy --dir=dist --prod
```

`public/_redirects` assure le routage de l'application, `public/_headers` ajoute les en-têtes de sécurité. Après le déploiement, renseigner l'adresse du site dans Supabase (Authentication > URL Configuration).

## Évolutions possibles

- CAPTCHA sur la commande publique.
- Automatisation via l'API WhatsApp Business (à développer séparément, avec webhooks officiels).
- Vraies photographies du restaurant.
