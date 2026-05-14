-- Enums
create type public.vendor_status as enum ('active','onboarding','offboarding','terminated');
create type public.sla_target_type as enum ('uptime_pct','response_minutes','resolution_minutes','custom');
create type public.breach_status as enum ('open','remediated','escalated','closed_no_action');

-- Vendors
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  archived_at timestamptz,
  name text not null unique,
  status vendor_status not null default 'active',
  website text,
  primary_contact_name text,
  primary_contact_email text,
  escalation_contact_name text,
  escalation_contact_email text,
  contract_url text,
  contract_end_at date,
  renewal_window_days int not null default 60,
  internal_owner_id uuid references public.users(id),
  notes text
);

create index vendors_status_idx on public.vendors(status);
create index vendors_archived_idx on public.vendors(archived_at);
create index vendors_contract_end_idx on public.vendors(contract_end_at);

create trigger vendors_set_updated
before update on public.vendors
for each row execute function public.set_updated_at_and_by();

alter table public.vendors enable row level security;

create policy vendors_select_viewer on public.vendors for select to authenticated using (is_viewer());
create policy vendors_insert_editor on public.vendors for insert to authenticated with check (is_editor());
create policy vendors_update_editor on public.vendors for update to authenticated using (is_editor()) with check (is_editor());

-- Backfill systems.vendor_id FK
alter table public.systems
  add constraint systems_vendor_id_fkey foreign key (vendor_id) references public.vendors(id);

-- SLAs
create table public.slas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  archived_at timestamptz,
  vendor_id uuid not null references public.vendors(id),
  system_id uuid references public.systems(id),
  name text not null,
  target_type sla_target_type not null,
  target_value numeric not null,
  review_cadence_days int not null default 90,
  last_reviewed_at timestamptz,
  notes text
);

create index slas_vendor_idx on public.slas(vendor_id);
create index slas_system_idx on public.slas(system_id);
create index slas_archived_idx on public.slas(archived_at);

create trigger slas_set_updated
before update on public.slas
for each row execute function public.set_updated_at_and_by();

alter table public.slas enable row level security;

create policy slas_select_viewer on public.slas for select to authenticated using (is_viewer());
create policy slas_insert_editor on public.slas for insert to authenticated with check (is_editor());
create policy slas_update_editor on public.slas for update to authenticated using (is_editor()) with check (is_editor());

-- Breaches
create table public.sla_breaches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  sla_id uuid not null references public.slas(id),
  occurred_at timestamptz not null,
  detected_at timestamptz,
  impact_summary text not null,
  status breach_status not null default 'open',
  remediation_notes text,
  closed_at timestamptz
);

create index sla_breaches_sla_idx on public.sla_breaches(sla_id);
create index sla_breaches_status_idx on public.sla_breaches(status);
create index sla_breaches_occurred_idx on public.sla_breaches(occurred_at);

create trigger sla_breaches_set_updated
before update on public.sla_breaches
for each row execute function public.set_updated_at_and_by();

alter table public.sla_breaches enable row level security;

create policy sla_breaches_select_viewer on public.sla_breaches for select to authenticated using (is_viewer());
create policy sla_breaches_insert_editor on public.sla_breaches for insert to authenticated with check (is_editor());

-- Editors can update breaches but cannot set status to closed_no_action (admin-only)
create policy sla_breaches_update_editor on public.sla_breaches for update to authenticated
  using (is_editor())
  with check (is_editor() and (status <> 'closed_no_action' or is_admin()));

-- Views
create or replace view public.v_vendor_health
with (security_invoker = true) as
select
  v.id as vendor_id,
  v.name,
  v.status,
  v.contract_end_at,
  (v.contract_end_at is not null and v.contract_end_at <= (current_date + (v.renewal_window_days || ' days')::interval)::date) as contract_ending_soon,
  coalesce(b.open_breaches_90d, 0) as open_breaches_90d,
  (coalesce(b.open_breaches_90d, 0) > 0) as has_recent_open_breach
from public.vendors v
left join (
  select s.vendor_id, count(*)::int as open_breaches_90d
  from public.sla_breaches br
  join public.slas s on s.id = br.sla_id
  where br.status in ('open','escalated')
    and br.occurred_at >= now() - interval '90 days'
  group by s.vendor_id
) b on b.vendor_id = v.id
where v.archived_at is null;

create or replace view public.v_sla_review_status
with (security_invoker = true) as
select
  s.id as sla_id,
  s.vendor_id,
  s.system_id,
  s.name,
  s.target_type,
  s.target_value,
  s.review_cadence_days,
  s.last_reviewed_at,
  (s.last_reviewed_at is null
    or s.last_reviewed_at < now() - (s.review_cadence_days || ' days')::interval) as is_overdue
from public.slas s
where s.archived_at is null;