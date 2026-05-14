
-- ============ ENUM ============
create type public.app_role as enum ('admin', 'editor', 'viewer');

-- ============ TABLES ============
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  created_by uuid
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log(entity_type, entity_id);
create index audit_log_actor_idx on public.audit_log(actor_id);

-- ============ HELPERS ============
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_user_role() = 'admin', false) $$;

create or replace function public.is_editor()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_user_role() in ('admin','editor'), false) $$;

create or replace function public.is_viewer()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_user_role() in ('admin','editor','viewer'), false) $$;

-- Reusable updated_at/updated_by trigger
create or replace function public.set_updated_at_and_by()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  begin
    new.updated_by := auth.uid();
  exception when others then
    -- column may not exist on every table; ignore
    null;
  end;
  return new;
end;
$$;

create trigger users_set_updated
  before update on public.users
  for each row execute function public.set_updated_at_and_by();

-- Auto-provision public.users + default viewer role on first sign-in
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role, created_by)
  values (new.id, 'viewer', new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Audit log writer (only path to write the audit_log)
create or replace function public.log_audit(
  _action text,
  _entity_type text,
  _entity_id uuid,
  _before jsonb default null,
  _after jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated to write audit log';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), _action, _entity_type, _entity_id, _before, _after)
  returning id into _id;
  return _id;
end;
$$;

-- ============ RLS ============
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_log enable row level security;

-- users policies
create policy "users_select_authenticated"
  on public.users for select
  to authenticated
  using (true);

create policy "users_update_self"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users_admin_all"
  on public.users for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- user_roles policies
create policy "user_roles_select_authenticated"
  on public.user_roles for select
  to authenticated
  using (true);

create policy "user_roles_admin_insert"
  on public.user_roles for insert
  to authenticated
  with check (public.is_admin());

create policy "user_roles_admin_update"
  on public.user_roles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "user_roles_admin_delete"
  on public.user_roles for delete
  to authenticated
  using (public.is_admin());

-- audit_log policies
create policy "audit_log_select_editor_admin"
  on public.audit_log for select
  to authenticated
  using (public.is_editor());

-- No insert/update/delete policies → only the SECURITY DEFINER log_audit() can write,
-- and rows can never be modified or removed by clients.
