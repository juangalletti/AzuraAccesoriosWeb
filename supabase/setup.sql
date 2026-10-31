-- =====================================================================
-- Azura · Configuración de la base de datos en Supabase
-- Pegá TODO este archivo en Supabase → SQL Editor → New query → Run.
-- IMPORTANTE: corrélo DESPUÉS de crear tu usuario admin
-- (Authentication → Users → Add user), porque al final lo marca como admin.
-- =====================================================================

-- 1) Tabla de productos
create table if not exists public.products (
  id          bigint generated always as identity primary key,
  name        text    not null,
  category    text    not null default 'collares',
  price       integer not null check (price >= 0),
  old_price   integer check (old_price >= 0),
  badge       text,
  description text,
  image_url   text,
  visible     boolean not null default true,
  stock_status text   not null default 'disponible' check (stock_status in ('disponible', 'ultimas', 'agotado')),
  material    text    not null default 'acero' check (material in ('acero', 'plata')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 2) Quién es admin
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 3) Permisos (Row Level Security)
alter table public.products enable row level security;
alter table public.admins   enable row level security;

drop policy if exists "ver productos"      on public.products;
drop policy if exists "admin crea"         on public.products;
drop policy if exists "admin edita"        on public.products;
drop policy if exists "admin borra"        on public.products;
drop policy if exists "admin se ve"        on public.admins;

-- Cualquiera ve los productos visibles; el admin ve todos
create policy "ver productos" on public.products
  for select using (visible or public.is_admin());

create policy "admin crea" on public.products
  for insert to authenticated with check (public.is_admin());

create policy "admin edita" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin borra" on public.products
  for delete to authenticated using (public.is_admin());

create policy "admin se ve" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- 4) Carpeta para las fotos (pública para ver, solo el admin sube/borra)
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists "admin lee fotos"   on storage.objects;
drop policy if exists "admin sube fotos"  on storage.objects;
drop policy if exists "admin cambia fotos" on storage.objects;
drop policy if exists "admin borra fotos" on storage.objects;

create policy "admin lee fotos" on storage.objects
  for select to authenticated using (bucket_id = 'productos' and public.is_admin());
create policy "admin sube fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'productos' and public.is_admin());
create policy "admin cambia fotos" on storage.objects
  for update to authenticated using (bucket_id = 'productos' and public.is_admin());
create policy "admin borra fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'productos' and public.is_admin());

-- 5) Marcarte como admin
--    ⚠️ Cambiá TU_EMAIL@ejemplo.com por el email del usuario que creaste (dejá las comillas simples)
insert into public.admins (user_id)
select id from auth.users
where lower(email) = lower('TU_EMAIL@ejemplo.com')
on conflict do nothing;

-- 6) Cargar los 7 collares actuales (solo si la tabla está vacía)
insert into public.products (name, category, price, badge, image_url, description, sort_order)
select * from (values
  ('Collar Frutilla', 'collares', 12000, 'Nuevo', 'img/collar-frutilla.jpg',
   'Cadena fina de acero blanco con un dije de frutilla roja con relieve de cristalitos. Un toque de color, dulce y divertido, para el día a día.', 1),
  ('Collar Mariposa', 'collares', 12000, null, 'img/collar-mariposa.jpg',
   'Delicada cadena de acero blanco con dije de mariposa en tono nacarado y borde plateado. Romántico y luminoso, ideal para regalar.', 2),
  ('Collar Bolitas', 'collares', 9500, null, 'img/collar-bolitas.jpg',
   'Cadena fina de acero blanco con pequeñas esferas distribuidas a lo largo. Minimalista y versátil: perfecto solo o combinado con otros collares.', 3),
  ('Collar Hojas Brillantes', 'collares', 13500, null, 'img/collar-hojas-brillantes.jpg',
   'Cadena de acero blanco con dije de tres hojas cubiertas de pequeñas piedras brillantes. Elegante y sutil, ilumina cualquier look.', 4),
  ('Collar Enredadera', 'collares', 14000, null, 'img/collar-enredadera.jpg',
   'Cadena de acero blanco con hojitas caladas y esferas intercaladas, como una enredadera alrededor del cuello. Natural y femenino.', 5),
  ('Collar Océano', 'collares', 18000, 'Favorito', 'img/collar-oceano.jpg',
   'Cadena de acero blanco de eslabones rectangulares con dijes marinos: ancla, caracolas, estrella de mar rosa, delfín, tortuga, estrella con strass y perla. Para llevar el verano siempre encima.', 6),
  ('Collar Corazón', 'collares', 16500, null, 'img/collar-corazon.jpg',
   'Cadena de acero blanco de eslabones gruesos con un gran dije de corazón con textura en relieve. Una pieza protagonista con mucha personalidad.', 7)
) as v
where not exists (select 1 from public.products);
