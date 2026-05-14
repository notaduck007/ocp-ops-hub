
-- Policy status enum
do $$ begin
  create type public.policy_status as enum ('draft','approved','retired');
exception when duplicate_object then null; end $$;

-- Policies table (current version snapshot)
create table public.policies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_md text not null,
  version int not null default 1,
  status public.policy_status not null default 'draft',
  owner_id uuid not null references public.users(id),
  approved_at timestamptz,
  approved_by uuid references public.users(id),
  next_review_due_at date,
  review_cadence_days int not null default 365,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create trigger policies_set_updated
before update on public.policies
for each row execute function public.set_updated_at_and_by();

-- Policy versions table (history + drafts in flight)
create table public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  version int not null,
  body_md text not null,
  status public.policy_status not null,
  approved_at timestamptz,
  approved_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (policy_id, version)
);

create trigger policy_versions_set_updated
before update on public.policy_versions
for each row execute function public.set_updated_at_and_by();

create index idx_policy_versions_policy on public.policy_versions(policy_id);

-- FK from risks.policy_id → policies.id
alter table public.risks
  add constraint risks_policy_id_fkey
  foreign key (policy_id) references public.policies(id) on delete set null;

-- RLS
alter table public.policies enable row level security;
alter table public.policy_versions enable row level security;

-- Viewer reads approved policies; editor+ read all
create policy policies_select_viewer_approved on public.policies
  for select to authenticated
  using (
    public.is_editor()
    or (public.is_viewer() and status = 'approved')
  );

create policy policies_insert_editor on public.policies
  for insert to authenticated
  with check (public.is_editor() and status = 'draft');

-- Editor can edit drafts, admin can edit anything (including approving via direct update)
create policy policies_update_editor on public.policies
  for update to authenticated
  using (public.is_editor())
  with check (
    public.is_editor() and (
      public.is_admin()
      -- editors cannot move out of draft
      or status = 'draft'
    )
  );

-- policy_versions
create policy policy_versions_select_viewer on public.policy_versions
  for select to authenticated
  using (
    public.is_editor()
    or (public.is_viewer() and status = 'approved')
  );

create policy policy_versions_insert_editor on public.policy_versions
  for insert to authenticated
  with check (
    public.is_editor() and (
      public.is_admin() or status = 'draft'
    )
  );

create policy policy_versions_update_admin on public.policy_versions
  for update to authenticated
  using (public.is_editor())
  with check (
    public.is_editor() and (
      public.is_admin() or status = 'draft'
    )
  );
