
-- Campaigns
create table public.access_review_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope_system_ids uuid[] not null default '{}',
  started_at date not null default current_date,
  due_at date not null,
  completed_at date,
  owner_id uuid not null references public.users(id),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create trigger arc_set_updated before update on public.access_review_campaigns
  for each row execute function public.set_updated_at_and_by();

-- Items
create table public.access_review_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.access_review_campaigns(id) on delete cascade,
  grant_id uuid not null references public.access_grants(id) on delete cascade,
  decision text check (decision in ('keep','revoke','reduce','investigate')),
  reviewer_id uuid references public.users(id),
  decided_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (campaign_id, grant_id)
);
create trigger ari_set_updated before update on public.access_review_items
  for each row execute function public.set_updated_at_and_by();
create index ari_campaign_idx on public.access_review_items(campaign_id);

-- Recurring tasks
create table public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('access_review','sla_review','policy_review','dr_test','mfa_validation','risk_review')),
  target_type text not null,
  target_id uuid not null,
  cadence_days int not null,
  next_due_at timestamptz not null,
  last_completed_at timestamptz,
  owner_id uuid not null references public.users(id),
  last_reminder_sent_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create trigger rt_set_updated before update on public.recurring_tasks
  for each row execute function public.set_updated_at_and_by();
create index rt_due_idx on public.recurring_tasks(next_due_at) where archived_at is null;
create index rt_owner_idx on public.recurring_tasks(owner_id);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications(user_id, read_at);

-- RLS
alter table public.access_review_campaigns enable row level security;
alter table public.access_review_items enable row level security;
alter table public.recurring_tasks enable row level security;
alter table public.notifications enable row level security;

create policy arc_select on public.access_review_campaigns for select to authenticated using (public.is_viewer());
create policy arc_insert on public.access_review_campaigns for insert to authenticated with check (public.is_editor());
create policy arc_update on public.access_review_campaigns for update to authenticated using (public.is_editor()) with check (public.is_editor());

create policy ari_select on public.access_review_items for select to authenticated using (public.is_viewer());
create policy ari_insert on public.access_review_items for insert to authenticated with check (public.is_editor());
create policy ari_update on public.access_review_items for update to authenticated using (public.is_editor()) with check (public.is_editor());

create policy rt_select on public.recurring_tasks for select to authenticated using (public.is_viewer());
create policy rt_insert on public.recurring_tasks for insert to authenticated with check (public.is_editor());
create policy rt_update on public.recurring_tasks for update to authenticated using (public.is_editor()) with check (public.is_editor());

create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Updated overdue-reviews view to include recurring tasks
create or replace view public.v_overdue_reviews
with (security_invoker = true) as
  select 'sla'::text as kind, s.id::uuid as id, s.name as label,
    (coalesce(s.last_reviewed_at, s.created_at) + ((s.review_cadence_days || ' days')::interval)) as due_at,
    null::uuid as owner_id
  from public.slas s
  where s.archived_at is null
    and (s.last_reviewed_at is null
      or s.last_reviewed_at < now() - ((s.review_cadence_days || ' days')::interval))
union all
  select 'access_grant'::text, ag.id::uuid, (p.full_name || ' → ' || sys.name),
    (coalesce(ag.last_reviewed_at, ag.created_at) + interval '90 days'),
    p.id
  from public.access_grants ag
  join public.people p on p.id = ag.person_id
  join public.systems sys on sys.id = ag.system_id
  where ag.archived_at is null and p.archived_at is null and p.status = 'active'
    and (ag.last_reviewed_at is null or ag.last_reviewed_at < now() - interval '90 days')
union all
  select 'risk'::text, r.id::uuid, r.title, r.next_review_due_at, r.owner_id
  from public.risks r
  where r.archived_at is null and r.status in ('open','mitigating')
    and r.next_review_due_at is not null and r.next_review_due_at < now()
union all
  select ('task:' || t.kind)::text, t.id::uuid,
    (t.kind || ' · ' || t.target_type) as label,
    t.next_due_at, t.owner_id
  from public.recurring_tasks t
  where t.archived_at is null and t.next_due_at < now();
