-- Seller Khata: database setup.
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again.

-- 1. One table holds everything (products, orders, expenses, stock, settings).
create table if not exists public.docs (
  owner      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  coll       text        not null,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (owner, coll, id)
);
create index if not exists docs_owner_coll_month on public.docs (owner, coll, (data->>'m'));

-- 2. Signed-in people may use the table through the app; anonymous visitors may not.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.docs to authenticated;
revoke all on table public.docs from anon;

-- 3. Each signed-in person sees and changes only their own rows.
alter table public.docs enable row level security;
drop policy if exists "Own rows only" on public.docs;
create policy "Own rows only" on public.docs
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- 4. Live updates, so your phone and computer stay in sync.
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null;
end $$;

-- 5. Product photos: public links, but only you can add or delete your own.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Upload own photos" on storage.objects;
create policy "Upload own photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Read own photo list" on storage.objects;
create policy "Read own photo list" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Delete own photos" on storage.objects;
create policy "Delete own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
