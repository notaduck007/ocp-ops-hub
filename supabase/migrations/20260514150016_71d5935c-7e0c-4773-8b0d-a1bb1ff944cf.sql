-- Enums
create type public.system_category as enum (
  'idp','github','crm','cms','storage','finance','event','security','collab','other'
);

create type public.criticality as enum ('low','medium','high','critical');

create type public.data_class as enum (
  'none','member_pii','staff_pii','financial','unpublished_spec','public'
);

-- Table
create table public.systems (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  archived_at timestamptz,
  name text not null unique,
  category public.system_category not null,
  description text,
  vendor_id uuid, -- FK to public.vendors added in Prompt 4
  url text,
  criticality public.criticality not null default 'medium',
  business_owner_id uuid references public.users(id),
  technical_owner_id uuid references public.users(id),
  data_classes public.data_class[] not null default array[]::public.data_class[],
  mfa_required boolean not null default true,
  rto_minutes int,
  rpo_minutes int,
  notes text
);

create index systems_name_lower_idx on public.systems (lower(name));
create index systems_category_idx on public.systems (category);
create index systems_active_idx on public.systems (archived_at) where archived_at is null;

-- updated_at / updated_by trigger
create trigger systems_set_updated
before update on public.systems
for each row execute function public.set_updated_at_and_by();

-- RLS
alter table public.systems enable row level security;

create policy systems_select_viewer
  on public.systems for select
  to authenticated
  using (public.is_viewer());

create policy systems_insert_editor
  on public.systems for insert
  to authenticated
  with check (public.is_editor());

create policy systems_update_editor
  on public.systems for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- No delete policy: archive-only.