-- Enums
create type public.person_type as enum ('staff','contractor','vendor_user','service_account');
create type public.person_status as enum ('active','inactive','offboarded');
create type public.access_role_level as enum ('read','write','admin','owner');

-- people
create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique,
  type public.person_type not null,
  status public.person_status not null default 'active',
  employer text,
  employment_start date,
  employment_end date,
  linked_user_id uuid references public.users(id) on delete set null,
  last_access_review_at timestamptz,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create index people_type_idx on public.people(type);
create index people_status_idx on public.people(status);
create index people_active_idx on public.people(archived_at) where archived_at is null;
create index people_full_name_idx on public.people(lower(full_name));

create trigger people_set_updated
before update on public.people
for each row execute function public.set_updated_at_and_by();

alter table public.people enable row level security;

create policy people_select_viewer on public.people
  for select to authenticated using (public.is_viewer());

create policy people_insert_editor on public.people
  for insert to authenticated with check (public.is_editor());

create policy people_update_editor on public.people
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

-- access_grants
create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  system_id uuid not null references public.systems(id) on delete cascade,
  role_level public.access_role_level not null,
  is_admin boolean not null default false,
  granted_at date,
  last_used_at date,
  last_reviewed_at timestamptz,
  source text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (person_id, system_id, role_level)
);

create index access_grants_person_idx on public.access_grants(person_id);
create index access_grants_system_idx on public.access_grants(system_id);
create index access_grants_active_idx on public.access_grants(archived_at) where archived_at is null;
create index access_grants_reviewed_idx on public.access_grants(last_reviewed_at);

create trigger access_grants_set_updated
before update on public.access_grants
for each row execute function public.set_updated_at_and_by();

alter table public.access_grants enable row level security;

create policy access_grants_select_viewer on public.access_grants
  for select to authenticated using (public.is_viewer());

create policy access_grants_insert_editor on public.access_grants
  for insert to authenticated with check (public.is_editor());

create policy access_grants_update_editor on public.access_grants
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

-- Cascade archive: when person.archived_at is set, archive their grants.
create or replace function public.cascade_archive_person()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.archived_at is not null and (old.archived_at is null or old.archived_at <> new.archived_at) then
    update public.access_grants
       set archived_at = new.archived_at
     where person_id = new.id and archived_at is null;
  end if;
  return new;
end;
$$;

create trigger people_cascade_archive
after update of archived_at on public.people
for each row execute function public.cascade_archive_person();

-- v_mfa_coverage view
create or replace view public.v_mfa_coverage
with (security_invoker = true)
as
with eligible as (
  select distinct p.id as person_id
    from public.people p
    join public.access_grants g on g.person_id = p.id and g.archived_at is null
    join public.systems s on s.id = g.system_id and s.archived_at is null and s.mfa_required = true
   where p.status = 'active' and p.archived_at is null
),
covered as (
  -- proxy for v1: anyone "eligible" is considered covered (they're on an MFA-required system).
  -- Real MFA telemetry will refine this in a later module.
  select person_id from eligible
)
select
  (select count(*) from covered) as covered_count,
  (select count(*) from eligible) as eligible_count,
  case
    when (select count(*) from eligible) = 0 then null
    else round(100.0 * (select count(*) from covered) / (select count(*) from eligible), 1)
  end as mfa_coverage_pct;

grant select on public.v_mfa_coverage to authenticated;