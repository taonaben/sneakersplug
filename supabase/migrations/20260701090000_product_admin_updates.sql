alter table public.products
  add column if not exists active boolean not null default true,
  add column if not exists description text;

drop policy if exists "Public read products for active stores" on public.products;

create policy "Public read products for active stores" on public.products
  for select using (
    active = true
    and exists (
      select 1 from public.stores
      where stores.id = products.store_id
        and stores.active = true
    )
  );
