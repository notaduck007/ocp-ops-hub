do $$ begin
  create type public.runbook_scenario as enum ('restore','outage','failover','continuity','offboarding');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dr_test_result as enum ('pass','partial','fail');
exception when duplicate_object then null; end $$;

create table if not exists public.runbooks (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems(id) on delete cascade,
  scenario public.runbook_scenario not null,
  title text not null,
  body_md text not null default '',
  owner_id uuid not null references public.users(id),
  last_tested_at timestamptz,
  next_test_due_at timestamptz,
  test_cadence_days int not null default 365,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (system_id, scenario, title)
);
alter table public.runbooks enable row level security;
create policy runbooks_select_viewer on public.runbooks for select to authenticated using (is_viewer());
create policy runbooks_insert_editor on public.runbooks for insert to authenticated with check (is_editor());
create policy runbooks_update_editor on public.runbooks for update to authenticated using (is_editor()) with check (is_editor());
create trigger runbooks_set_updated before update on public.runbooks
  for each row execute function public.set_updated_at_and_by();

create table if not exists public.dr_tests (
  id uuid primary key default gen_random_uuid(),
  runbook_id uuid not null references public.runbooks(id) on delete cascade,
  performed_at timestamptz not null,
  performed_by_id uuid not null references public.users(id),
  result public.dr_test_result not null,
  duration_minutes int,
  notes_md text,
  remediation_items text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
alter table public.dr_tests enable row level security;
create policy dr_tests_select_viewer on public.dr_tests for select to authenticated using (is_viewer());
create policy dr_tests_insert_editor on public.dr_tests for insert to authenticated with check (is_editor());
create policy dr_tests_update_editor on public.dr_tests for update to authenticated using (is_editor()) with check (is_editor());
create trigger dr_tests_set_updated before update on public.dr_tests
  for each row execute function public.set_updated_at_and_by();

create or replace function public.bump_runbook_after_test()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare cad int;
begin
  select test_cadence_days into cad from public.runbooks where id = new.runbook_id;
  update public.runbooks
     set last_tested_at = greatest(coalesce(last_tested_at, '-infinity'::timestamptz), new.performed_at),
         next_test_due_at = new.performed_at + make_interval(days => coalesce(cad, 365))
   where id = new.runbook_id;
  return new;
end;
$$;
create trigger dr_tests_bump_runbook
  after insert on public.dr_tests
  for each row execute function public.bump_runbook_after_test();

create table if not exists public.continuity_scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_summary text,
  impact_summary text,
  decision_authority_user_id uuid not null references public.users(id),
  comms_template_md text,
  linked_system_ids uuid[] not null default array[]::uuid[],
  linked_runbook_ids uuid[] not null default array[]::uuid[],
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
alter table public.continuity_scenarios enable row level security;
create policy cs_select_viewer on public.continuity_scenarios for select to authenticated using (is_viewer());
create policy cs_insert_editor on public.continuity_scenarios for insert to authenticated with check (is_editor());
create policy cs_update_editor on public.continuity_scenarios for update to authenticated using (is_editor()) with check (is_editor());
create trigger cs_set_updated before update on public.continuity_scenarios
  for each row execute function public.set_updated_at_and_by();

drop view if exists public.v_dr_readiness;
create view public.v_dr_readiness as
with crit as (
  select id from public.systems
   where archived_at is null and criticality in ('high','critical')
),
tested as (
  select distinct r.system_id
    from public.runbooks r
   where r.archived_at is null
     and r.last_tested_at is not null
     and r.last_tested_at >= now() - interval '365 days'
     and r.system_id in (select id from crit)
)
select
  (select count(*) from crit)::int as critical_systems_total,
  (select count(*) from tested)::int as critical_systems_tested_recently,
  case when (select count(*) from crit) = 0 then null
       else round(((select count(*) from tested)::numeric / nullif((select count(*) from crit), 0)) * 100, 0)
  end as pct;

grant select on public.v_dr_readiness to authenticated;