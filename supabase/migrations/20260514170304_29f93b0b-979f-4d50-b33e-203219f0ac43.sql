-- Enum
do $$ begin
  create type public.evidence_kind as enum ('access_review','dr_test','policy','incident','change','sla_review','risk_review','control');
exception when duplicate_object then null; end $$;

-- Table
create table if not exists public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  archived_at timestamptz,
  kind public.evidence_kind not null,
  linked_entity_type text not null,
  linked_entity_id uuid not null,
  bucket text not null default 'evidence',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  description text,
  uploaded_by uuid not null references public.users(id)
);

create index if not exists idx_evidence_files_link on public.evidence_files (linked_entity_type, linked_entity_id);
create index if not exists idx_evidence_files_kind on public.evidence_files (kind);

alter table public.evidence_files enable row level security;

create policy evidence_files_select_viewer on public.evidence_files
  for select to authenticated using (public.is_viewer());

create policy evidence_files_insert_editor on public.evidence_files
  for insert to authenticated with check (public.is_editor() and uploaded_by = auth.uid());

create policy evidence_files_update_editor on public.evidence_files
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

drop trigger if exists trg_evidence_files_set_updated on public.evidence_files;
create trigger trg_evidence_files_set_updated before update on public.evidence_files
  for each row execute function public.set_updated_at_and_by();

-- Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('evidence','evidence', false)
on conflict (id) do nothing;

-- Storage RLS policies for the evidence bucket
drop policy if exists evidence_obj_select on storage.objects;
create policy evidence_obj_select on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and public.is_viewer());

drop policy if exists evidence_obj_insert on storage.objects;
create policy evidence_obj_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and public.is_editor());

drop policy if exists evidence_obj_update on storage.objects;
create policy evidence_obj_update on storage.objects
  for update to authenticated
  using (bucket_id = 'evidence' and public.is_editor())
  with check (bucket_id = 'evidence' and public.is_editor());
