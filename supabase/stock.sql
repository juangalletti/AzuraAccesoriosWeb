-- =====================================================================
-- Azura · Agregar estado de stock a los productos
-- Pegá este archivo en Supabase → SQL Editor → New query → Run.
-- Se puede correr más de una vez sin problema.
-- =====================================================================

alter table public.products
  add column if not exists stock_status text not null default 'disponible';

alter table public.products drop constraint if exists products_stock_status_check;
alter table public.products
  add constraint products_stock_status_check
  check (stock_status in ('disponible', 'ultimas', 'agotado'));
