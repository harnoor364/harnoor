-- =====================================================================
-- Admin panel (/admin): already applied to the live "harnoor" project.
-- Keep this file as the record of what exists, or to rebuild it.
-- Run after docs/supabase/setup.sql. Safe to read; run once.
-- =====================================================================

-- Who may edit the website (no API access to this table at all)
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Editable content: one row per section; everyone reads, only admins write
create table if not exists public.site_content (
  key text primary key check (key in ('site', 'projects', 'reviews', 'packages', 'monthly_plans')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null
);
alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;
create policy "Anyone can read site content" on public.site_content for select to anon, authenticated using (true);
create policy "Admins can add site content" on public.site_content for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can change site content" on public.site_content for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can remove site content" on public.site_content for delete to authenticated using ((select public.is_admin()));

create or replace function public.touch_site_content()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger site_content_touch before insert or update on public.site_content
  for each row execute function public.touch_site_content();

-- Client projects: admins see and update every row (clients still see only their own)
create policy "Admins can read all client projects" on public.client_projects for select to authenticated using ((select public.is_admin()));
create policy "Admins can update client projects" on public.client_projects for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant update (project_name, status, notes) on public.client_projects to authenticated;

-- Images: public bucket, images only, up to 5 MB, admins upload
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "Admins can upload site media" on storage.objects for insert to authenticated with check (bucket_id = 'site-media' and (select public.is_admin()));
create policy "Admins can replace site media" on storage.objects for update to authenticated using (bucket_id = 'site-media' and (select public.is_admin())) with check (bucket_id = 'site-media' and (select public.is_admin()));
create policy "Admins can delete site media" on storage.objects for delete to authenticated using (bucket_id = 'site-media' and (select public.is_admin()));

-- Make an account an admin (it must have signed up on the website first):
-- insert into public.admins (user_id) select id from auth.users where email = 'someone@example.com';
-- Remove an admin:
-- delete from public.admins where user_id = (select id from auth.users where email = 'someone@example.com');
