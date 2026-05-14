-- Enums
create type public.risk_kind as enum ('risk','exception');
create type public.risk_status as enum ('open','mitigating','accepted','closed');

-- Table
create table public.risks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  archived_at timestamptz,

  kind public.risk_kind not null,
  title text not null,
  description text,
  severity int not null check (severity between 1 and 4),
  likelihood int not null check (likelihood between 1 and 4),
  score int generated always as (severity * likelihood) stored,
  status public.risk_status not null default 'open',

  owner_id uuid not null references public.users(id),
  system_id uuid references public.systems(id),
  vendor_id uuid references public.vendors(id),
  policy_id uuid,

  accepted_by uuid references public.users(id),
  accepted_at timestamptz,
  accepted_until date,
  acceptance_justification text,

  next_review_due_at timestamptz,
  review_cadence_days int not null default 90,
  notes text
);

create index risks_score_idx on public.risks (score desc);
create index risks_status_idx on public.risks (status);
create index risks_owner_idx on public.risks (owner_id);
create index risks_active_idx on public.risks (archived_at) where archived_at is null;

create trigger risks_set_updated
  before update on public.risks
  for each row execute function public.set_updated_at_and_by();

-- RLS
alter table public.risks enable row level security;

create policy risks_select_viewer on public.risks
  for select to authenticated using (public.is_viewer());

create policy risks_insert_editor on public.risks
  for insert to authenticated
  with check (
    public.is_editor()
    and (status not in ('accepted','closed') or public.is_admin())
  );

create policy risks_update_editor on public.risks
  for update to authenticated
  using (public.is_editor())
  with check (
    public.is_editor()
    and (status not in ('accepted','closed') or public.is_admin())
  );
