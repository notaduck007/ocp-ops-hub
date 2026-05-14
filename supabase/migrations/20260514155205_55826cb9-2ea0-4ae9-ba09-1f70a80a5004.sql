
-- Open critical risks view (full rows; consumer can count or take top N)
create or replace view public.v_open_critical_risks
with (security_invoker = true) as
select
  r.id,
  r.title,
  r.severity,
  r.likelihood,
  r.score,
  r.status,
  r.owner_id,
  r.system_id,
  r.vendor_id
from public.risks r
where r.archived_at is null
  and r.status in ('open','mitigating')
  and r.severity >= 3;

-- Overdue reviews unified feed
create or replace view public.v_overdue_reviews
with (security_invoker = true) as
  -- SLAs overdue
  select
    'sla'::text as kind,
    s.id::uuid as id,
    s.name as label,
    (coalesce(s.last_reviewed_at, s.created_at)
      + ((s.review_cadence_days || ' days')::interval)) as due_at,
    null::uuid as owner_id
  from public.slas s
  where s.archived_at is null
    and (s.last_reviewed_at is null
      or s.last_reviewed_at < now() - ((s.review_cadence_days || ' days')::interval))
union all
  -- Access grants not reviewed in 90+ days for active people
  select
    'access_grant'::text as kind,
    ag.id::uuid as id,
    (p.full_name || ' → ' || sys.name) as label,
    (coalesce(ag.last_reviewed_at, ag.created_at) + interval '90 days') as due_at,
    p.id as owner_id
  from public.access_grants ag
  join public.people p on p.id = ag.person_id
  join public.systems sys on sys.id = ag.system_id
  where ag.archived_at is null
    and p.archived_at is null
    and p.status = 'active'
    and (ag.last_reviewed_at is null
      or ag.last_reviewed_at < now() - interval '90 days')
union all
  -- Risks past next_review_due_at
  select
    'risk'::text as kind,
    r.id::uuid as id,
    r.title as label,
    r.next_review_due_at as due_at,
    r.owner_id
  from public.risks r
  where r.archived_at is null
    and r.status in ('open','mitigating')
    and r.next_review_due_at is not null
    and r.next_review_due_at < now();

-- Incidents this quarter placeholder (returns zero rows; UI shows zeros)
create or replace view public.v_incidents_this_quarter
with (security_invoker = true) as
select
  null::uuid as id,
  'low'::text as severity,
  0::integer as count
where false;

-- DR readiness placeholder
create or replace view public.v_dr_readiness
with (security_invoker = true) as
select
  0::integer as critical_systems,
  0::integer as tested_last_12mo,
  0::numeric as readiness_pct
where false;
