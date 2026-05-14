# Systems Registry — Prompt 2

Build the canonical IT systems inventory. New module behind the `_authenticated` layout, written against the existing `createServerFn` + `requireSupabaseAuth` + audit-log conventions established in Prompt 1.

## Migration `0002_systems.sql`

Three enums + one table + RLS:

- Enum `system_category` — `idp, github, crm, cms, storage, finance, event, security, collab, other`
- Enum `criticality` — `low, medium, high, critical`
- Enum `data_class` — `none, member_pii, staff_pii, financial, unpublished_spec, public`
- Table `public.systems` with all columns from the brief. `vendor_id uuid` is added with NO FK constraint yet (the FK to `public.vendors` lands in Prompt 4 via a separate `ALTER TABLE`); column is nullable so it's harmless until then.
- Trigger: reuse existing `public.set_updated_at_and_by()` for `BEFORE UPDATE`.
- RLS:
  - `systems_select_viewer` — `SELECT` to authenticated using `is_viewer()`
  - `systems_insert_editor` — `INSERT` with check `is_editor()`
  - `systems_update_editor` — `UPDATE` using/with check `is_editor()`
  - `systems_archive_admin` — handled in code: archive = update `archived_at`; admins-only enforced server-side AND via a policy that allows only admins to set `archived_at` to non-null. Simplest: keep `update_editor` for general edits and add a SECURITY DEFINER server fn `archiveSystem` that uses an admin-gate check (mirrors `assertAdmin` pattern). RLS stays as one editor-update policy; the server fn is the gate.
  - No DELETE policy (archive only).
- Index: `systems_name_idx` (lower(name)), `systems_category_idx`, partial index `systems_active_idx` on `archived_at IS NULL`.

## Server functions — `src/lib/systems.functions.ts`

All use `requireSupabaseAuth`; each mutating fn writes an `audit_log` row via `log_audit` rpc with `entity_type='systems'`.

- `listSystems({ search?, category?, criticality?, ownerId?, includeArchived? })` → `SystemRow[]` joined with owner names.
- `getSystem({ id })` → full row + owner display info.
- `createSystem(input)` → insert, audit `system.create` (after only).
- `updateSystem({ id, patch })` → read prev, update, audit `system.update` with before/after diff of changed fields.
- `archiveSystem({ id })` / `unarchiveSystem({ id })` → admin-gated, sets/clears `archived_at`, audit `system.archive` / `system.unarchive`.
- `listSystemAudit({ systemId })` → returns `audit_log` rows where `entity_type='systems' AND entity_id=systemId` (RLS already restricts to editor/admin).
- Helper `searchUsersForOwner({ q })` → small `users` lookup for the owner combobox (returns id, full_name, email).

Validation via zod. Owner ids validated as `uuid().nullable()`. `data_classes` is an array of the enum.

## Routes

Flat dot-separated under `_authenticated`:

- `src/routes/_authenticated.systems.tsx` — list layout (renders `<Outlet />` if needed; otherwise plain page). Uses index file pattern below.
- `src/routes/_authenticated.systems.index.tsx` — list page.
- `src/routes/_authenticated.systems.$systemId.tsx` — detail page with shadcn `Tabs` for Overview / Activity.

Each route uses TanStack Query (no loader) so `useCurrentRole` gating + auth-attacher works without prerender hassles.

## UI

### List `/systems`
- shadcn `Table` with columns: Name (Link to detail), Category (Badge variant by category), Criticality (colored Badge: low=slate, medium=blue, high=amber, critical=red — defined as small helper), Business Owner, Technical Owner, MFA Required (`ShieldCheck`/`ShieldOff` lucide icon), Updated (relative time).
- Toolbar: search `Input` (debounced 200 ms), category `Select` (with "All"), criticality `Select`, owner `Combobox` (reusing the user-search server fn), "Show archived" `Switch`.
- All filters intersect; sorting handled client-side via column header buttons.
- "+ New System" `Button` (hidden for viewers) opens a `Sheet` containing the system form.

### Detail `/systems/:id`
- Header: name + category/criticality badges + archive/unarchive button (admins).
- `Tabs`:
  - **Overview** — same shadcn `Form` as create, prefilled. Read-only for viewers (all fields disabled, no Save). Editable for editors/admins.
  - **Activity** — table of audit entries (action, actor email, before/after JSON in a collapsible cell, timestamp). Tab itself is hidden for viewers.

### Form (shared create/edit component)
- `react-hook-form` + zod. Fields:
  - `name` (required, unique check happens at DB; surface PG error nicely)
  - `category` (Select, required)
  - `criticality` (Select, default `medium`, required)
  - `description` (Textarea)
  - `url` (Input, validated as URL when non-empty)
  - `business_owner_id` / `technical_owner_id` (`Combobox` over users)
  - `data_classes` (multi-select via checkbox group; default `[]`)
  - `mfa_required` (Switch, default true)
  - `notes` (Textarea)
  - `vendor_id`, `rto_minutes`, `rpo_minutes` — omitted from UI (vendor lands in Prompt 4; RTO/RPO in Prompt 11). Column exists; UI doesn't expose it yet.

### Owner Combobox component
- New `src/components/owner-combobox.tsx` using shadcn `Command` + `Popover`. Calls `searchUsersForOwner` with a TanStack Query keyed by query string.

## Sidebar

Update `src/components/layout/app-layout.tsx`:
- Introduce a grouped `NAV_GROUPS` shape (`{ label, items }`). First group = "Inventory" with `Systems` (`Server` icon). Second group = empty/no-label for Dashboard, third group = "Admin" for Users.
- Renders group label as a small uppercase muted heading; existing styling otherwise unchanged.

## Role gating

- Use existing `useCurrentRole()` hook.
  - Viewers: list visible; row links visible; detail Overview shows read-only form; New / Edit Save / Archive controls hidden; Activity tab hidden.
  - Direct-URL protection: Overview form's submit button disabled + form fields disabled when `role === 'viewer'`. Server fns also assert via RLS (insert/update fail) and the admin gate for archive — defense in depth.

## Acceptance check walk-through (matches brief)

1. New System sheet → name "GitHub — OCP Org", category github, criticality critical → row appears in list.
2. Edit name on detail page → updateSystem audit row written with before/after diff visible in Activity tab.
3. Sign in as viewer → no "+ New System" button; visiting `/systems/:id` shows fields but Save disabled; Activity tab hidden.
4. Search "git" + category filter `github` both apply (AND).
5. Archive system → disappears from default list; "Show archived" reveals it with a muted style + Unarchive control.

## Build order

1. Run migration `0002_systems.sql` (await user approval).
2. Add `src/lib/systems.functions.ts`.
3. Add `src/components/owner-combobox.tsx` and `src/components/systems/system-form.tsx`.
4. Add the three route files.
5. Update sidebar nav grouping in `app-layout.tsx`.
6. Smoke-test: list renders, create works, audit row appears, role gating respected.

## Open questions (will assume defaults unless you push back)

- **Unique-name conflict UX**: surface as toast + inline error on the `name` field. OK?
- **Archive UI**: archived rows shown with `text-muted-foreground` and an "Archived" badge. OK?
- **Owners**: only users from `public.users` are selectable; no free-text. OK?
