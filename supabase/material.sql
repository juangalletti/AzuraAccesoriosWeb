-- =====================================================================
-- Azura · Agregar el material de cada producto (acero blanco o plata)
-- Pegá este archivo en Supabase → SQL Editor → New query → Run.
-- Se puede correr más de una vez sin problema.
-- Todos los productos que ya existen quedan como "acero" (acero blanco).
-- =====================================================================

alter table public.products
  add column if not exists material text not null default 'acero';

alter table public.products drop constraint if exists products_material_check;
alter table public.products
  add constraint products_material_check
  check (material in ('acero', 'plata'));
