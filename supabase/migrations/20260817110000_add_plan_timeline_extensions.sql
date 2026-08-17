alter table public.plans
  add column extension_years smallint not null default 0,
  add constraint plans_extension_years_check
    check (extension_years between 0 and 10);

create or replace function public.set_current_user_plan_extension_years(
  p_extension_years smallint
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'You must be signed in to update a plan.';
  end if;

  if p_extension_years is null
    or p_extension_years < 0
    or p_extension_years > 10 then
    raise exception using
      errcode = '22023',
      message = 'Plan extensions must be between zero and ten years.';
  end if;

  update public.plans
  set extension_years = p_extension_years,
      updated_at = now()
  where owner_id = v_user_id
    and is_primary
    and status = 'active';

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Your primary plan was not found.';
  end if;
end;
$function$;

revoke all on function public.set_current_user_plan_extension_years(smallint)
  from public, anon, service_role;
grant execute on function public.set_current_user_plan_extension_years(smallint)
  to authenticated;
