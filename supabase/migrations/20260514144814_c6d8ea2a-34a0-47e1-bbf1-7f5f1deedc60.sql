
-- Pin search_path on the trigger function (linter warning fix)
create or replace function public.set_updated_at_and_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  begin
    new.updated_by := auth.uid();
  exception when others then
    null;
  end;
  return new;
end;
$$;

-- Revoke EXECUTE from anon on internal helpers (still callable by authenticated + RLS)
revoke execute on function public.current_user_role() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_editor() from anon;
revoke execute on function public.is_viewer() from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.log_audit(text, text, uuid, jsonb, jsonb) from anon;
