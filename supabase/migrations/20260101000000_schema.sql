-- Restaurant Kenza : schéma de base (tables, fonctions utilitaires, RLS, stockage)

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  price_xof integer not null check (price_xof >= 0),
  image_url text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create index products_featured_idx on public.products(is_featured) where is_featured;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);

create sequence public.order_ref_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  fulfillment_type text not null check (fulfillment_type in ('delivery','pickup')),
  delivery_address text,
  notes text,
  subtotal_xof integer not null default 0 check (subtotal_xof >= 0),
  delivery_fee_xof integer not null default 0 check (delivery_fee_xof >= 0),
  total_xof integer not null default 0 check (total_xof >= 0),
  status text not null default 'pending' check (status in
    ('pending','confirmed','preparing','ready','delivering','completed','cancelled')),
  source text not null default 'website' check (source in ('website','whatsapp_manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders(status);
create index orders_created_idx on public.orders(created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price_xof integer not null check (unit_price_xof >= 0),
  quantity integer not null check (quantity between 1 and 50),
  line_total_xof integer not null check (line_total_xof >= 0)
);
create index order_items_order_idx on public.order_items(order_id);

create table public.restaurant_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Restaurant Kenza',
  description text not null default '',
  whatsapp_number text not null default '22796953233',
  phone text,
  email text,
  address text,
  opening_hours text,
  delivery_fee_xof integer not null default 0 check (delivery_fee_xof >= 0),
  logo_url text,
  updated_at timestamptz not null default now()
);
insert into public.restaurant_settings (id) values (1);

-- Fonctions utilitaires
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.restaurant_settings
  for each row execute function public.touch_updated_at();

-- Profil créé à chaque inscription, toujours avec le rôle 'staff'
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sécurité (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.restaurant_settings enable row level security;

create policy "profil: lecture du sien" on public.profiles for select using (id = auth.uid());
create policy "profil: admin lit tout" on public.profiles for select using (public.is_admin());

create policy "categories: lecture publique" on public.categories for select using (true);
create policy "categories: admin écrit" on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy "products: lecture publique" on public.products for select using (true);
create policy "products: admin écrit" on public.products for all using (public.is_admin()) with check (public.is_admin());

create policy "settings: lecture publique" on public.restaurant_settings for select using (true);
create policy "settings: admin modifie" on public.restaurant_settings for update using (public.is_admin()) with check (public.is_admin());

create policy "customers: admin" on public.customers for all using (public.is_admin()) with check (public.is_admin());
create policy "orders: admin" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "order_items: admin" on public.order_items for all using (public.is_admin()) with check (public.is_admin());

-- Stockage des images
insert into storage.buckets (id, name, public) values ('kenza-media', 'kenza-media', true)
on conflict (id) do nothing;

create policy "media: lecture publique" on storage.objects for select using (bucket_id = 'kenza-media');
create policy "media: admin envoie" on storage.objects for insert with check (bucket_id = 'kenza-media' and public.is_admin());
create policy "media: admin modifie" on storage.objects for update using (bucket_id = 'kenza-media' and public.is_admin());
create policy "media: admin supprime" on storage.objects for delete using (bucket_id = 'kenza-media' and public.is_admin());
