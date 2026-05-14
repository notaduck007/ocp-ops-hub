
do $$ begin
  create type incident_status as enum ('declared','contained','resolved','post_mortem','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comms_audience as enum ('internal_it','leadership','staff_all','member','vendor','board');
exception when duplicate_object then null; end $$;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  archived_at timestamptz,
  title text not null,
  severity int not null check (severity between 1 and 4),
  status incident_status not null default 'declared',
  declared_by uuid not null references public.users(id),
  declared_at timestamptz not null default now(),
  contained_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  impact_summary text,
  root_cause text,
  post_mortem_md text,
  post_mortem_completed_at timestamptz,
  next_test_due_at timestamptz
);

drop trigger if exists trg_incidents_updated_at on public.incidents;
create trigger trg_incidents_updated_at
  before update on public.incidents
  for each row execute function public.set_updated_at_and_by();

alter table public.incidents enable row level security;

drop policy if exists incidents_select_viewer on public.incidents;
drop policy if exists incidents_insert_editor on public.incidents;
drop policy if exists incidents_update_editor on public.incidents;

create policy incidents_select_viewer on public.incidents
  for select to authenticated using (public.is_viewer());
create policy incidents_insert_editor on public.incidents
  for insert to authenticated with check (public.is_editor());
create policy incidents_update_editor on public.incidents
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor() and (status <> 'closed' or public.is_admin()));

create table if not exists public.incident_systems (
  incident_id uuid not null references public.incidents(id) on delete cascade,
  system_id uuid not null references public.systems(id),
  primary key (incident_id, system_id)
);
alter table public.incident_systems enable row level security;
drop policy if exists incident_systems_select_viewer on public.incident_systems;
drop policy if exists incident_systems_insert_editor on public.incident_systems;
drop policy if exists incident_systems_delete_editor on public.incident_systems;
create policy incident_systems_select_viewer on public.incident_systems
  for select to authenticated using (public.is_viewer());
create policy incident_systems_insert_editor on public.incident_systems
  for insert to authenticated with check (public.is_editor());
create policy incident_systems_delete_editor on public.incident_systems
  for delete to authenticated using (public.is_editor());

create table if not exists public.incident_comms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  audience comms_audience not null,
  channel text,
  summary text not null,
  sent_at timestamptz not null default now()
);
drop trigger if exists trg_incident_comms_updated_at on public.incident_comms;
create trigger trg_incident_comms_updated_at
  before update on public.incident_comms
  for each row execute function public.set_updated_at_and_by();

alter table public.incident_comms enable row level security;
drop policy if exists incident_comms_select_viewer on public.incident_comms;
drop policy if exists incident_comms_insert_editor on public.incident_comms;
drop policy if exists incident_comms_update_editor on public.incident_comms;
create policy incident_comms_select_viewer on public.incident_comms
  for select to authenticated using (public.is_viewer());
create policy incident_comms_insert_editor on public.incident_comms
  for insert to authenticated with check (public.is_editor());
create policy incident_comms_update_editor on public.incident_comms
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

drop view if exists public.v_incidents_this_quarter;
create view public.v_incidents_this_quarter
with (security_invoker = true) as
select
  severity,
  count(*)::int as count
from public.incidents
where archived_at is null
  and declared_at >= date_trunc('quarter', now())
  and declared_at <  date_trunc('quarter', now()) + interval '3 months'
group by severity;

create or replace function public.enforce_incident_close_rules()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if new.status = 'closed' and (old.status is distinct from 'closed') then
    if new.severity <= 2 and new.post_mortem_completed_at is null then
      raise exception 'Post-mortem must be completed before closing a severity % incident', new.severity
        using errcode = 'check_violation';
    end if;
    new.closed_at := coalesce(new.closed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_incidents_close_rules on public.incidents;
create trigger trg_incidents_close_rules
  before update on public.incidents
  for each row execute function public.enforce_incident_close_rules();

create index if not exists idx_incidents_declared_at on public.incidents(declared_at desc);
create index if not exists idx_incidents_status on public.incidents(status);
create index if not exists idx_incident_systems_system on public.incident_systems(system_id);
create index if not exists idx_incident_comms_incident on public.incident_comms(incident_id, sent_at desc);
