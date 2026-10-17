-- =====================================================================
-- Upward Web client portal: run this ONCE in Supabase → SQL Editor → New query.
-- Creates the table that /account reads, locks it down with Row Level
-- Security, and adds a row automatically for every new sign-up.
-- Safe to run again: everything is "if not exists" / "or replace".
-- =====================================================================

create table if not exists public.client_projects (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  client_name  text,
  project_name text,
  status       text not null default 'Not started'
               check (status in ('Not started', 'Designing', 'In review', 'Live')),
  notes        text check (char_length(notes) <= 2000),
  updated_at   timestamptz not null default now()
);

-- Row Level Security: a logged-in client can READ ONLY THEIR OWN row.
-- Clients cannot insert, change or delete anything. You edit rows in the
-- Supabase dashboard (Table Editor), which is not limited by these rules.
alter table public.client_projects enable row level security;

revoke all on public.client_projects from anon;
revoke all on public.client_projects from authenticated;
grant select on public.client_projects to authenticated;

drop policy if exists "Clients can read their own project" on public.client_projects;
create policy "Clients can read their own project"
  on public.client_projects
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Keep "Last updated" correct whenever you edit a row.
create or replace function public.touch_client_project()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists client_projects_touch on public.client_projects;
create trigger client_projects_touch
  before update on public.client_projects
  for each row execute function public.touch_client_project();

-- Create an empty project row for every new account, so it shows up in the
-- Table Editor ready for you to fill in the project name, status and notes.
create or replace function public.handle_new_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.client_projects (user_id, client_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_client() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_client on auth.users;
create trigger on_auth_user_created_client
  after insert on auth.users
  for each row execute function public.handle_new_client();
