-- 0007_changes.sql

create type public.change_class as enum ('standard','normal','emergency');
create type public.change_status as enum ('proposed','approved','rejected','in_flight','completed','rolled_back');

create table public.changes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  class public.change_class not null,
  status public.change_status not null default 'proposed',
  description text,
  risk_summary text,
  rollback_plan text not null,
  comms_plan text,
  requested_by uuid not null references public.users(id),
  approver_id uuid references public.users(id),
  approved_at timestamptz,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  rolled_back_at timestamptz,
  rollback_note text,
  linked_incident_id uuid references public.incidents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  archived_at timestamptz,
  constraint changes_rollback_plan_not_blank check (length(btrim(rollback_plan)) > 0)
);

create index idx_changes_status on public.changes(status);
create index idx_changes_class on public.changes(class);
create index idx_changes_scheduled_at on public.changes(scheduled_at);
create index idx_changes_linked_incident on public.changes(linked_incident_id);

create trigger changes_set_updated
before update on public.changes
for each row execute function public.set_updated_at_and_by();

create table public.change_systems (
  change_id uuid not null references public.changes(id) on delete cascade,
  system_id uuid not null references public.systems(id) on delete cascade,
  primary key (change_id, system_id)
);

create index idx_change_systems_system on public.change_systems(system_id);

-- RLS
alter table public.changes enable row level security;
alter table public.change_systems enable row level security;

create policy "changes_select_viewer" on public.changes
  for select to authenticated using (public.is_viewer());

-- Editors can insert; only admins can insert at non-proposed status
create policy "changes_insert_editor" on public.changes
  for insert to authenticated
  with check (
    public.is_editor()
    and (status = 'proposed' or public.is_admin())
  );

-- Editors can update only their own proposed rows. Admins can update anything.
-- Editors cannot move into 'rejected' or 'rolled_back' (admin-only).
create policy "changes_update_editor" on public.changes
  for update to authenticated
  using (
    public.is_editor()
    and (
      public.is_admin()
      or (status = 'proposed' and requested_by = auth.uid())
    )
  )
  with check (
    public.is_editor()
    and (
      public.is_admin()
      or (
        status not in ('rejected','rolled_back')
        and requested_by = auth.uid()
      )
    )
  );

create policy "change_systems_select_viewer" on public.change_systems
  for select to authenticated using (public.is_viewer());

create policy "change_systems_insert_editor" on public.change_systems
  for insert to authenticated with check (public.is_editor());

create policy "change_systems_delete_editor" on public.change_systems
  for delete to authenticated using (public.is_editor());

-- Validation trigger: transition rules
create or replace function public.enforce_change_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Cannot move to in_flight unless approved and scheduled
  if new.status = 'in_flight' and (old.status is distinct from 'in_flight') then
    if not exists (select 1 where new.scheduled_at is not null) then
      raise exception 'Cannot start a change without scheduled_at'
        using errcode = 'check_violation';
    end if;
    if old.status <> 'approved' then
      raise exception 'Change must be approved before it can be in_flight'
        using errcode = 'check_violation';
    end if;
    new.started_at := coalesce(new.started_at, now());
  end if;

  -- Approval auto-stamp
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    new.approved_at := coalesce(new.approved_at, now());
  end if;

  -- Completion auto-stamp
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    if old.status <> 'in_flight' then
      raise exception 'Only in-flight changes can be completed'
        using errcode = 'check_violation';
    end if;
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  -- Rollback requires a note
  if new.status = 'rolled_back' and (old.status is distinct from 'rolled_back') then
    if new.rollback_note is null or length(btrim(new.rollback_note)) = 0 then
      raise exception 'A rollback_note is required to mark a change rolled_back'
        using errcode = 'check_violation';
    end if;
    new.rolled_back_at := coalesce(new.rolled_back_at, now());
  end if;

  return new;
end;
$$;

create trigger changes_enforce_rules
before update on public.changes
for each row execute function public.enforce_change_rules();
