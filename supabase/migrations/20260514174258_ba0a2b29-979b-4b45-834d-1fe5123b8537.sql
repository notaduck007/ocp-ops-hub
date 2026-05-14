-- 0099_seed.sql — idempotent seed data for OCP IT Hub

CREATE UNIQUE INDEX IF NOT EXISTS vendors_name_key ON public.vendors(name);
CREATE UNIQUE INDEX IF NOT EXISTS systems_name_key ON public.systems(name);
CREATE UNIQUE INDEX IF NOT EXISTS people_email_key ON public.people(email);
CREATE UNIQUE INDEX IF NOT EXISTS risks_title_key ON public.risks(title);
CREATE UNIQUE INDEX IF NOT EXISTS incidents_title_key ON public.incidents(title);
CREATE UNIQUE INDEX IF NOT EXISTS changes_title_key ON public.changes(title);
CREATE UNIQUE INDEX IF NOT EXISTS policies_title_key ON public.policies(title);
CREATE UNIQUE INDEX IF NOT EXISTS runbooks_title_key ON public.runbooks(title);
CREATE UNIQUE INDEX IF NOT EXISTS slas_name_key ON public.slas(name);
CREATE UNIQUE INDEX IF NOT EXISTS continuity_scenarios_name_key ON public.continuity_scenarios(name);
CREATE UNIQUE INDEX IF NOT EXISTS access_grants_unique ON public.access_grants(person_id, system_id, role_level);
CREATE UNIQUE INDEX IF NOT EXISTS recurring_tasks_unique ON public.recurring_tasks(target_type, target_id, kind);
CREATE UNIQUE INDEX IF NOT EXISTS policy_versions_unique ON public.policy_versions(policy_id, version);

DO $$
DECLARE
  _actor uuid;
BEGIN
  SELECT id INTO _actor FROM public.users ORDER BY created_at LIMIT 1;
  IF _actor IS NULL THEN
    RAISE NOTICE 'No user present, skipping seed';
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (_actor, 'admin', _actor)
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  -- VENDORS
  INSERT INTO public.vendors (name, status, website, primary_contact_name, primary_contact_email, contract_end_at, renewal_window_days, created_by, updated_by)
  VALUES
    ('Google Workspace','active','https://workspace.google.com','Google Account Mgr','am@google.com',  current_date + 200, 60, _actor, _actor),
    ('GitHub Inc.',     'active','https://github.com',           'GitHub AM',          'am@github.com',    current_date + 300, 60, _actor, _actor),
    ('Salesforce',      'active','https://salesforce.com',       'Salesforce AM',      'am@salesforce.com',current_date + 100, 60, _actor, _actor),
    ('Fonteva',         'active','https://fonteva.com',          'Fonteva AM',         'am@fonteva.com',   current_date + 400, 60, _actor, _actor),
    ('AWS',             'active','https://aws.amazon.com',       'AWS TAM',            'tam@aws.com',      current_date + 500, 90, _actor, _actor),
    ('Cloudflare',      'active','https://cloudflare.com',       'Cloudflare AM',      'am@cloudflare.com',current_date + 250, 60, _actor, _actor),
    ('1Password',       'active','https://1password.com',        '1Password AM',       'am@1password.com', current_date + 180, 60, _actor, _actor),
    ('Zoom',            'active','https://zoom.us',              'Zoom AM',            'am@zoom.us',       current_date + 150, 60, _actor, _actor),
    ('HubSpot',         'active','https://hubspot.com',          'HubSpot AM',         'am@hubspot.com',   current_date + 220, 60, _actor, _actor),
    ('Asana',           'active','https://asana.com',            'Asana AM',           'am@asana.com',     current_date + 90,  60, _actor, _actor),
    ('Dropbox',         'active','https://dropbox.com',          'Dropbox AM',         'am@dropbox.com',   current_date + 60,  60, _actor, _actor),
    ('PandaDoc',        'active','https://pandadoc.com',         'PandaDoc AM',        'am@pandadoc.com',  current_date + 120, 60, _actor, _actor)
  ON CONFLICT (name) DO NOTHING;

  -- SYSTEMS
  INSERT INTO public.systems (name, category, criticality, mfa_required, vendor_id, data_classes, rto_minutes, rpo_minutes, business_owner_id, technical_owner_id, created_by, updated_by)
  SELECT x.n, x.c, x.cr, true, v.id, x.dc, x.rto, x.rpo, _actor, _actor, _actor, _actor
  FROM (VALUES
    ('Google Workspace',          'idp'::system_category,      'critical'::criticality, 'Google Workspace', ARRAY['staff_pii','member_pii']::data_class[], 60,  15),
    ('GitHub — OCP Org',          'github'::system_category,   'critical'::criticality, 'GitHub Inc.',      ARRAY['unpublished_spec']::data_class[],       240, 60),
    ('Salesforce CRM',            'crm'::system_category,      'high'::criticality,     'Salesforce',       ARRAY['member_pii']::data_class[],             480, 120),
    ('Fonteva AMS',               'crm'::system_category,      'high'::criticality,     'Fonteva',          ARRAY['member_pii','financial']::data_class[], 480, 120),
    ('AWS Production',            'storage'::system_category,  'critical'::criticality, 'AWS',              ARRAY['unpublished_spec']::data_class[],       120, 30),
    ('Cloudflare Edge',           'security'::system_category, 'high'::criticality,     'Cloudflare',       ARRAY['public']::data_class[],                 60,  15),
    ('1Password Vault',           'security'::system_category, 'critical'::criticality, '1Password',        ARRAY['staff_pii']::data_class[],              240, 60),
    ('Zoom',                      'collab'::system_category,   'medium'::criticality,   'Zoom',             ARRAY['none']::data_class[],                   480, 240),
    ('HubSpot Marketing',         'cms'::system_category,      'medium'::criticality,   'HubSpot',          ARRAY['member_pii']::data_class[],             720, 240),
    ('Asana',                     'collab'::system_category,   'medium'::criticality,   'Asana',            ARRAY['none']::data_class[],                   720, 240),
    ('Dropbox',                   'storage'::system_category,  'medium'::criticality,   'Dropbox',          ARRAY['unpublished_spec']::data_class[],       480, 120),
    ('PandaDoc',                  'finance'::system_category,  'medium'::criticality,   'PandaDoc',         ARRAY['financial']::data_class[],              720, 240),
    ('Internal Wiki',             'cms'::system_category,      'medium'::criticality,    NULL,              ARRAY['unpublished_spec']::data_class[],       480, 120),
    ('Internal Asset Inventory',  'other'::system_category,    'medium'::criticality,    NULL,              ARRAY['none']::data_class[],                   720, 240),
    ('OCP.dev Marketing Site',    'cms'::system_category,      'low'::criticality,      'Cloudflare',       ARRAY['public']::data_class[],                 240, 60)
  ) AS x(n,c,cr,vname,dc,rto,rpo)
  LEFT JOIN public.vendors v ON v.name = x.vname
  ON CONFLICT (name) DO NOTHING;

  -- PEOPLE
  INSERT INTO public.people (full_name, email, type, status, employer, employment_start, created_by, updated_by)
  VALUES
    ('Alex Chen',       'alex.chen@opencompute.org',       'staff','active','OCP',                current_date - 800, _actor, _actor),
    ('Priya Patel',     'priya.patel@opencompute.org',     'staff','active','OCP',                current_date - 700, _actor, _actor),
    ('Marcus Johnson',  'marcus.johnson@opencompute.org',  'staff','active','OCP',                current_date - 600, _actor, _actor),
    ('Sara Mueller',    'sara.mueller@opencompute.org',    'staff','active','OCP',                current_date - 500, _actor, _actor),
    ('David Kim',       'david.kim@opencompute.org',       'staff','active','OCP',                current_date - 450, _actor, _actor),
    ('Helen Rivera',    'helen.rivera@opencompute.org',    'staff','active','OCP',                current_date - 400, _actor, _actor),
    ('Lin Wong',        'lin.wong@opencompute.org',        'staff','active','OCP',                current_date - 200, _actor, _actor),
    ('Tom Becker',      'tom.becker@opencompute.org',      'contractor','active','Becker Consulting', current_date - 300, _actor, _actor),
    ('Jen Wallace',     'jen.wallace@opencompute.org',     'contractor','active','Wallace LLC',       current_date - 150, _actor, _actor),
    ('Raj Singh',       'raj.singh@opencompute.org',       'contractor','active','Singh Dev',         current_date - 100, _actor, _actor)
  ON CONFLICT (email) DO NOTHING;

  -- ACCESS GRANTS
  INSERT INTO public.access_grants (person_id, system_id, role_level, is_admin, granted_at, last_used_at, last_reviewed_at, created_by, updated_by)
  SELECT p.id, s.id,
    CASE
      WHEN p.full_name = 'Alex Chen'      AND s.name = 'Google Workspace' THEN 'owner'::access_role_level
      WHEN p.full_name = 'Priya Patel'    AND s.name = 'GitHub — OCP Org' THEN 'admin'::access_role_level
      WHEN p.full_name = 'Marcus Johnson' AND s.name = 'AWS Production'   THEN 'admin'::access_role_level
      WHEN p.type = 'contractor' THEN 'read'::access_role_level
      ELSE 'write'::access_role_level
    END,
    (p.full_name = 'Alex Chen' AND s.name = 'Google Workspace')
       OR (p.full_name = 'Priya Patel' AND s.name = 'GitHub — OCP Org')
       OR (p.full_name = 'Marcus Johnson' AND s.name = 'AWS Production'),
    current_date - 90, current_date - 5, now() - interval '70 days',
    _actor, _actor
  FROM public.people p
  CROSS JOIN public.systems s
  WHERE
       s.name IN ('Google Workspace','1Password Vault','Zoom','Asana','Internal Wiki')
    OR (p.type = 'staff' AND s.name IN ('GitHub — OCP Org','AWS Production','Salesforce CRM','Dropbox','HubSpot Marketing'))
    OR (p.full_name IN ('Tom Becker','Raj Singh') AND s.name = 'GitHub — OCP Org')
  ON CONFLICT (person_id, system_id, role_level) DO NOTHING;

  -- RISKS (score is generated; do not insert)
  INSERT INTO public.risks (title, kind, severity, likelihood, status, owner_id, system_id, vendor_id, description, next_review_due_at, created_by, updated_by)
  SELECT r.t, r.k, r.sev, r.lik, r.st, _actor,
    (SELECT id FROM public.systems WHERE name = r.sn),
    (SELECT id FROM public.vendors WHERE name = r.vn),
    r.descr, now() + interval '60 days', _actor, _actor
  FROM (VALUES
    ('Lack of automated GitHub admin offboarding',                   'risk'::risk_kind,      4, 4, 'open'::risk_status,       'GitHub — OCP Org', NULL,         'Manual offboarding leaves former contractors with potential admin access'),
    ('SSO bypass via legacy app passwords',                          'risk'::risk_kind,      4, 3, 'open'::risk_status,       'Google Workspace', 'Google Workspace','Some legacy integrations still allow app-password bypass'),
    ('Salesforce backups not encrypted with org-managed keys',       'risk'::risk_kind,      3, 3, 'mitigating'::risk_status, 'Salesforce CRM',   'Salesforce', 'Backups stored without org-managed key'),
    ('Insufficient DR testing on AWS production',                    'risk'::risk_kind,      3, 4, 'mitigating'::risk_status, 'AWS Production',   'AWS',        'Annual restore drill not performed in 14 months'),
    ('Vendor concentration risk: Cloudflare',                        'risk'::risk_kind,      3, 3, 'mitigating'::risk_status,  NULL,             'Cloudflare', 'Multiple critical paths depend on a single vendor'),
    ('Contractor access reviewed annually instead of quarterly',     'exception'::risk_kind, 2, 3, 'accepted'::risk_status,    NULL,              NULL,        'Documented exception granted by leadership'),
    ('PandaDoc lacks current SOC2 Type II report',                   'exception'::risk_kind, 2, 2, 'accepted'::risk_status,   'PandaDoc',        'PandaDoc',   'Awaiting vendor-provided report'),
    ('Stale Zoom recording retention',                               'risk'::risk_kind,      1, 2, 'closed'::risk_status,     'Zoom',            'Zoom',       'Retention policy now enforced')
  ) AS r(t,k,sev,lik,st,sn,vn,descr)
  ON CONFLICT (title) DO NOTHING;

  UPDATE public.risks
     SET accepted_at = now() - interval '30 days',
         accepted_by = _actor,
         accepted_until = current_date + 180,
         acceptance_justification = 'Risk accepted by leadership; revisit at next review'
   WHERE status = 'accepted' AND accepted_at IS NULL;

  -- INCIDENTS
  INSERT INTO public.incidents (title, severity, status, declared_by, declared_at, contained_at, resolved_at, closed_at, post_mortem_completed_at, post_mortem_md, root_cause, impact_summary, created_by, updated_by)
  VALUES
    ('Salesforce outage during member renewal window', 2, 'closed',   _actor, now() - interval '40 days', now() - interval '40 days' + interval '2 hours', now() - interval '40 days' + interval '4 hours', now() - interval '38 days', now() - interval '35 days',
       E'## What happened\nVendor incident impacted login for ~3h.\n\n## Action items\n- Subscribe to vendor status page\n- Add member-facing comms template',
       'Vendor regional outage', 'Members could not renew memberships for ~3h', _actor, _actor),
    ('GitHub Actions queue backed up',                  3, 'resolved', _actor, now() - interval '20 days', now() - interval '20 days' + interval '1 hour',  now() - interval '19 days',                  NULL,                       NULL, NULL, NULL, 'CI delays for engineering team',                    _actor, _actor),
    ('1Password sync delays for SSO users',             3, 'resolved', _actor, now() - interval '10 days', now() - interval '10 days' + interval '30 minutes', now() - interval '10 days' + interval '6 hours', NULL,               NULL, NULL, NULL, 'Some users had to re-auth manually',                _actor, _actor),
    ('AWS S3 IAM policy misconfiguration',              4, 'declared', _actor, now() - interval '2 days',  NULL,                                            NULL,                                            NULL,                  NULL, NULL, NULL, 'Internal report; no data exposure confirmed',       _actor, _actor),
    ('Phishing email reported by staff',                1, 'closed',   _actor, now() - interval '60 days', now() - interval '60 days' + interval '1 hour',  now() - interval '60 days' + interval '2 hours', now() - interval '59 days', NULL, NULL, 'Reported and blocked, no compromise', 'No impact', _actor, _actor)
  ON CONFLICT (title) DO NOTHING;

  -- CHANGES
  INSERT INTO public.changes (title, class, status, requested_by, description, risk_summary, rollback_plan, scheduled_at, approver_id, approved_at, started_at, completed_at, rolled_back_at, rollback_note, created_by, updated_by)
  VALUES
    ('Enable mandatory SSO on GitHub org',            'normal',    'completed', _actor, 'Force SSO for all org members',          'Users may need to re-link accounts',         'Disable enforcement via org settings', now() - interval '20 days', _actor, now() - interval '22 days', now() - interval '20 days', now() - interval '20 days' + interval '1 hour', NULL, NULL, _actor, _actor),
    ('Rotate AWS root account credentials',           'standard',  'completed', _actor, 'Quarterly rotation',                      'Low — documented procedure',                 'Restore previous credentials from vault', now() - interval '15 days', _actor, now() - interval '16 days', now() - interval '15 days', now() - interval '15 days' + interval '30 minutes', NULL, NULL, _actor, _actor),
    ('Migrate Salesforce sandbox to new region',      'normal',    'in_flight', _actor, 'Region migration for latency',            'Possible read-only window 2h',               'Re-point DNS back to old region',          now() + interval '3 days',  _actor, now() - interval '5 days',  now() - interval '1 day',   NULL,                                              NULL, NULL, _actor, _actor),
    ('Emergency Cloudflare WAF rule for ongoing attack','emergency','completed',_actor, 'Block burst from /24',                    'May block some legitimate traffic',          'Remove WAF rule',                          now() - interval '7 days',  _actor, now() - interval '7 days' - interval '5 minutes', now() - interval '7 days', now() - interval '7 days' + interval '20 minutes', NULL, NULL, _actor, _actor),
    ('Quarterly 1Password integration update',        'standard',  'approved',  _actor, 'Apply minor SCIM changes',                'Low',                                        'Disable SCIM toggle',                      now() + interval '7 days',  _actor, now() - interval '1 day',   NULL,                       NULL,                                              NULL, NULL, _actor, _actor),
    ('Proposed: enable Zoom waiting rooms by default','normal',    'proposed',  _actor, 'Tighten meeting security',                'Low — UX change',                            'Disable waiting rooms',                    NULL,                       NULL,   NULL,                       NULL,                       NULL,                                              NULL, NULL, _actor, _actor)
  ON CONFLICT (title) DO NOTHING;

  -- POLICIES
  INSERT INTO public.policies (title, body_md, version, status, owner_id, approved_at, approved_by, next_review_due_at, created_by, updated_by)
  VALUES
    ('Incident Response Policy',  E'# Incident Response\n\nDeclare → Contain → Resolve → Post-mortem.', 1, 'approved', _actor, now() - interval '60 days', _actor, current_date + 305, _actor, _actor),
    ('Acceptable Use Policy',     E'# Acceptable Use\n\nUse OCP systems for legitimate business purposes.', 1, 'approved', _actor, now() - interval '60 days', _actor, current_date + 305, _actor, _actor),
    ('Data Handling Policy',      E'# Data Handling\n\nClassify, label, and protect data per its data class.', 1, 'approved', _actor, now() - interval '60 days', _actor, current_date + 305, _actor, _actor),
    ('Access Management Policy',  E'# Access Management\n\nLeast privilege, MFA required, quarterly access reviews.', 1, 'approved', _actor, now() - interval '60 days', _actor, current_date + 305, _actor, _actor)
  ON CONFLICT (title) DO NOTHING;

  INSERT INTO public.policy_versions (policy_id, version, body_md, status, approved_at, approved_by, created_by, updated_by)
  SELECT p.id, p.version, p.body_md, p.status, p.approved_at, p.approved_by, _actor, _actor
  FROM public.policies p
  ON CONFLICT (policy_id, version) DO NOTHING;

  -- RUNBOOKS
  INSERT INTO public.runbooks (system_id, scenario, title, body_md, owner_id, last_tested_at, next_test_due_at, test_cadence_days, created_by, updated_by)
  SELECT s.id, x.sc, x.t, x.body, _actor, x.lt, x.nt, 365, _actor, _actor
  FROM (VALUES
    ('Google Workspace',  'restore'::runbook_scenario, 'Restore Google Workspace admin access', E'1. Use break-glass account\n2. Reset super admin\n3. Verify MFA',                  now() - interval '120 days', now() + interval '245 days'),
    ('GitHub — OCP Org',  'restore'::runbook_scenario, 'Restore GitHub org admin access',       E'1. Contact GitHub support\n2. Verify domain ownership\n3. Reassign org owner',     now() - interval '90 days',  now() + interval '275 days'),
    ('AWS Production',    'restore'::runbook_scenario, 'Restore AWS root and IAM admin',         E'1. Use root recovery flow\n2. Restore IAM admin via Organizations',               now() - interval '200 days', now() + interval '165 days'),
    ('1Password Vault',   'restore'::runbook_scenario, 'Restore 1Password recovery',             E'1. Use printed Recovery Kit\n2. Re-issue invitations\n3. Audit vault access',     now() - interval '60 days',  now() + interval '305 days'),
    ('Cloudflare Edge',   'outage'::runbook_scenario,  'Cloudflare edge outage response',        E'1. Identify affected zone\n2. Failover DNS to origin\n3. Notify staff',          NULL,                         now() + interval '180 days'),
    ('Salesforce CRM',    'outage'::runbook_scenario,  'Salesforce outage response',             E'1. Subscribe to status page\n2. Inform members\n3. Queue renewals offline',      NULL,                         now() + interval '180 days')
  ) AS x(sn, sc, t, body, lt, nt)
  JOIN public.systems s ON s.name = x.sn
  ON CONFLICT (title) DO NOTHING;

  INSERT INTO public.dr_tests (runbook_id, performed_at, performed_by_id, result, duration_minutes, notes_md, created_by, updated_by)
  SELECT r.id, r.last_tested_at, _actor, 'pass'::dr_test_result, 45, E'Tabletop exercise; restore steps validated.', _actor, _actor
  FROM public.runbooks r
  WHERE r.last_tested_at IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.dr_tests t WHERE t.runbook_id = r.id);

  -- CONTINUITY
  INSERT INTO public.continuity_scenarios (name, trigger_summary, impact_summary, decision_authority_user_id, comms_template_md, linked_system_ids, linked_runbook_ids, created_by, updated_by)
  VALUES
    ('Identity provider outage',
       'Google Workspace unavailable >30 min',
       'No SSO; staff cannot access most systems',
       _actor,
       E'Subject: IT — IdP outage\nWe are working with Google to restore access. Use break-glass account if needed.',
       ARRAY(SELECT id FROM public.systems  WHERE name='Google Workspace'),
       ARRAY(SELECT id FROM public.runbooks WHERE title='Restore Google Workspace admin access'),
       _actor, _actor),
    ('GitHub outage',
       'GitHub.com unavailable >1h',
       'Engineering paused; CI/CD blocked',
       _actor,
       E'Subject: IT — GitHub outage\nWe are monitoring GitHub status and will update hourly.',
       ARRAY(SELECT id FROM public.systems  WHERE name='GitHub — OCP Org'),
       ARRAY(SELECT id FROM public.runbooks WHERE title='Restore GitHub org admin access'),
       _actor, _actor),
    ('Loss of key IT personnel',
       'Sole admin unreachable >48h',
       'No system admin coverage',
       _actor,
       E'Subject: IT — coverage update\nBackup admin is assuming duties effective immediately.',
       ARRAY[]::uuid[], ARRAY[]::uuid[],
       _actor, _actor)
  ON CONFLICT (name) DO NOTHING;

  -- SLAs
  INSERT INTO public.slas (name, vendor_id, system_id, target_type, target_value, review_cadence_days, last_reviewed_at, created_by, updated_by)
  SELECT x.n,
    (SELECT id FROM public.vendors WHERE name = x.vn),
    (SELECT id FROM public.systems WHERE name = x.sn),
    x.tt, x.tv, 90, x.lr, _actor, _actor
  FROM (VALUES
    ('Google Workspace uptime',     'Google Workspace','Google Workspace',  'uptime_pct'::sla_target_type,         99.9,  now() - interval '30 days'),
    ('Google Workspace P1 response','Google Workspace','Google Workspace',  'response_minutes'::sla_target_type,   60,    now() - interval '30 days'),
    ('GitHub uptime',               'GitHub Inc.',     'GitHub — OCP Org',  'uptime_pct'::sla_target_type,         99.9,  now() - interval '45 days'),
    ('AWS production uptime',       'AWS',             'AWS Production',    'uptime_pct'::sla_target_type,         99.95, now() - interval '20 days'),
    ('Cloudflare edge uptime',      'Cloudflare',      'Cloudflare Edge',   'uptime_pct'::sla_target_type,         99.99, now() - interval '60 days'),
    ('1Password uptime',            '1Password',       '1Password Vault',   'uptime_pct'::sla_target_type,         99.9,  now() - interval '40 days'),
    ('Salesforce uptime',           'Salesforce',      'Salesforce CRM',    'uptime_pct'::sla_target_type,         99.5,  now() - interval '110 days'),
    ('Zoom P2 resolution',          'Zoom',            'Zoom',              'resolution_minutes'::sla_target_type, 240,   now() - interval '50 days')
  ) AS x(n, vn, sn, tt, tv, lr)
  ON CONFLICT (name) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.sla_breaches WHERE impact_summary = 'Salesforce missed P1 response by 45m during renewal window') THEN
    INSERT INTO public.sla_breaches (sla_id, occurred_at, detected_at, impact_summary, status, created_by, updated_by)
    VALUES (
      (SELECT id FROM public.slas WHERE name = 'Salesforce uptime'),
      now() - interval '40 days', now() - interval '40 days',
      'Salesforce missed P1 response by 45m during renewal window', 'open', _actor, _actor
    );
  END IF;

  -- RECURRING TASKS
  INSERT INTO public.recurring_tasks (target_type, target_id, kind, owner_id, cadence_days, next_due_at, last_completed_at, created_by, updated_by)
  SELECT 'system', s.id, 'access_review', _actor, 90,
         CASE WHEN s.criticality = 'critical' THEN now() - interval '20 days' ELSE now() + interval '30 days' END,
         now() - interval '110 days', _actor, _actor
  FROM public.systems s
  WHERE s.criticality IN ('critical','high')
  ON CONFLICT (target_type, target_id, kind) DO NOTHING;

  INSERT INTO public.recurring_tasks (target_type, target_id, kind, owner_id, cadence_days, next_due_at, last_completed_at, created_by, updated_by)
  SELECT 'system', s.id, 'dr_test', _actor, 365,
         now() + interval '60 days', now() - interval '305 days', _actor, _actor
  FROM public.systems s
  WHERE s.criticality = 'critical'
  ON CONFLICT (target_type, target_id, kind) DO NOTHING;

  INSERT INTO public.recurring_tasks (target_type, target_id, kind, owner_id, cadence_days, next_due_at, last_completed_at, created_by, updated_by)
  SELECT 'policy', p.id, 'policy_review', _actor, 365,
         now() + interval '305 days', now() - interval '60 days', _actor, _actor
  FROM public.policies p
  ON CONFLICT (target_type, target_id, kind) DO NOTHING;

END $$;