-- Keep catalogue snapshots immutable while allowing owners to correct their results.
create function public.save_current_user_academic_result(
  p_id uuid, p_operation text default 'save', p_mark numeric default null,
  p_grade text default null, p_units numeric default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  target uuid;
  result_status text;
  result_mark numeric := p_mark;
  result_grade text := nullif(p_grade, '');
begin
  if owner is null then raise exception 'Authentication is required.' using errcode='42501'; end if;
  if p_operation is null or p_operation not in ('save','clear','remove') then raise exception 'The result operation is invalid.' using errcode='22023'; end if;
  select id into target from public.course_attempts where id=p_id and owner_id=owner for update;
  if p_operation='remove' then
    if target is not null then delete from public.course_attempts where id=target and owner_id=owner;
    elsif not public.remove_current_user_plan_item(p_id) then raise exception 'The course was not found.' using errcode='42501'; end if;
    return p_id;
  end if;
  if p_operation='clear' then
    if target is null then raise exception 'The result was not found.' using errcode='42501'; end if;
    update public.course_attempts set status='enrolled',mark=null,grade=null,units_earned=0 where id=target and owner_id=owner;
    return target;
  end if;
  if result_grade is not null and result_grade not in ('PS','NCN','CRS','CRN','HLP','WD','WL','WN','DA','PX','RP','WA','WF','KU','RC','STE','STI','EE') then
    raise exception 'The result code is invalid.' using errcode='22023';
  end if;
  if result_grade='PS' then result_mark:=50;
  elsif result_grade='NCN' then result_mark:=coalesce(result_mark,0);
  elsif result_grade is not null then result_mark:=null;
  end if;
  if (result_grade is null and result_mark is null) or result_mark < 0 or result_mark > 100 or result_mark::text in ('NaN','Infinity','-Infinity') or result_mark <> round(result_mark,2) then
    raise exception 'The mark must be between 0 and 100 with up to two decimal places.' using errcode='22023';
  end if;
  result_status := case
    when result_grade in ('NCN','WN','CRN') then 'failed'
    when result_grade in ('PS','CRS','HLP') then 'completed'
    when result_grade in ('WD','WL','STE','STI','EE') then 'withdrawn'
    when result_grade is not null then 'enrolled'
    when result_mark >= 50 then 'completed' else 'failed' end;
  if target is null then
    target:=public.record_current_user_course_attempt(p_id, case when result_status='withdrawn' then 'enrolled' else result_status end, result_mark, p_units);
  end if;
  update public.course_attempts set status=result_status, mark=result_mark, grade=result_grade,
    units_earned=case when result_status='completed' then units_attempted else 0 end
    where id=target and owner_id=owner;
  return target;
end;
$$;
revoke all on function public.save_current_user_academic_result(uuid,text,numeric,text,numeric) from public,anon,authenticated,service_role;
grant execute on function public.save_current_user_academic_result(uuid,text,numeric,text,numeric) to authenticated;
