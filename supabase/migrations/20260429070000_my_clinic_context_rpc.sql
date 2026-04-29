create schema if not exists private;

create or replace function private.get_my_clinic_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_clinic jsonb;
  v_profile jsonb;
  v_clinica_id uuid;
begin
  if v_user_id is null then
    return null;
  end if;

  select to_jsonb(c)
    into v_clinic
  from public.clinicas c
  where c.user_id = v_user_id
  limit 1;

  if v_clinic is not null then
    return jsonb_build_object(
      'clinic', v_clinic,
      'profile', null
    );
  end if;

  select to_jsonb(u), u.clinica_id
    into v_profile, v_clinica_id
  from public.usuarios u
  where u.user_id = v_user_id
    and u.ativo = true
  order by u.created_at asc
  limit 1;

  if v_profile is null then
    return null;
  end if;

  select to_jsonb(c)
    into v_clinic
  from public.clinicas c
  where c.id = v_clinica_id
  limit 1;

  return jsonb_build_object(
    'clinic', v_clinic,
    'profile', v_profile
  );
end;
$$;

create or replace function public.get_my_clinic_context()
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.get_my_clinic_context();
$$;

revoke execute on function public.get_my_clinic_context() from anon;
grant execute on function public.get_my_clinic_context() to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.get_my_clinic_context() to authenticated;
