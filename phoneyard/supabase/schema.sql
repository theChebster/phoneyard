create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('buyer', 'vendor', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('active', 'suspended', 'banned');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_status as enum ('draft', 'pending', 'approved', 'rejected', 'removed');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role public.app_role not null default 'buyer',
  status public.account_status not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  logo_url text,
  stall_number text,
  location text,
  phone text,
  whatsapp text,
  bio text,
  open_time time,
  close_time time,
  open_days text[] default '{}',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  brand text not null,
  model text not null,
  storage text,
  network text,
  condition text,
  price numeric(12, 2) not null check (price >= 0),
  images text[] not null default '{}',
  specs jsonb not null default '{}',
  stock_qty int not null default 1,
  negotiable boolean not null default false,
  status public.listing_status not null default 'pending',
  views int not null default 0,
  wishlist_saves int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wishlists (
  buyer_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_id, listing_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete set null,
  rating int check (rating between 1 and 5),
  body text,
  verified_purchase boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  opened_by uuid references public.profiles(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.promotion_requests (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  kind text not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.taxonomy (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  name text not null,
  active boolean not null default true,
  unique (kind, name)
);

-- ---------------------------------------------------------------------------
-- Functions & triggers
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'buyer')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_vendor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'vendor' and status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.listings enable row level security;
alter table public.wishlists enable row level security;
alter table public.reviews enable row level security;
alter table public.support_tickets enable row level security;
alter table public.promotion_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_settings enable row level security;
alter table public.taxonomy enable row level security;

-- profiles
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- shops
drop policy if exists shops_public on public.shops;
create policy shops_public on public.shops
  for select using (verified = true or owner_id = auth.uid() or public.is_admin());

drop policy if exists shops_vendor_insert on public.shops;
create policy shops_vendor_insert on public.shops
  for insert with check (public.is_vendor() and owner_id = auth.uid());

drop policy if exists shops_vendor_update on public.shops;
create policy shops_vendor_update on public.shops
  for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- listings
drop policy if exists listings_public on public.listings;
create policy listings_public on public.listings
  for select using (status = 'approved' or vendor_id = auth.uid() or public.is_admin());

drop policy if exists listings_vendor_insert on public.listings;
create policy listings_vendor_insert on public.listings
  for insert with check (public.is_vendor() and vendor_id = auth.uid());

drop policy if exists listings_vendor_update on public.listings;
create policy listings_vendor_update on public.listings
  for update
  using (vendor_id = auth.uid() or public.is_admin())
  with check (vendor_id = auth.uid() or public.is_admin());

drop policy if exists listings_admin_delete on public.listings;
create policy listings_admin_delete on public.listings
  for delete using (public.is_admin());

-- wishlists
drop policy if exists wishlist_owner on public.wishlists;
create policy wishlist_owner on public.wishlists
  for all using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());

-- reviews
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select using (true);

drop policy if exists reviews_buyer_write on public.reviews;
create policy reviews_buyer_write on public.reviews
  for insert with check (auth.uid() = buyer_id);

-- support tickets
drop policy if exists tickets_owner on public.support_tickets;
create policy tickets_owner on public.support_tickets
  for all
  using (opened_by = auth.uid() or public.is_admin())
  with check (opened_by = auth.uid() or public.is_admin());

-- promotion requests
drop policy if exists promotions_vendor on public.promotion_requests;
create policy promotions_vendor on public.promotion_requests
  for all
  using (vendor_id = auth.uid() or public.is_admin())
  with check (vendor_id = auth.uid() or public.is_admin());

-- audit logs
drop policy if exists audit_admin_insert on public.audit_logs;
create policy audit_admin_insert on public.audit_logs
  for insert with check (public.is_admin());

drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs
  for select using (public.is_admin());

-- platform settings
drop policy if exists settings_admin on public.platform_settings;
create policy settings_admin on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- taxonomy
drop policy if exists taxonomy_public_read on public.taxonomy;
create policy taxonomy_public_read on public.taxonomy
  for select using (active = true or public.is_admin());

drop policy if exists taxonomy_admin_write on public.taxonomy;
create policy taxonomy_admin_write on public.taxonomy
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('phoneyard', 'phoneyard', true)
on conflict (id) do nothing;
