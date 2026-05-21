-- Permite que a secretaria (caixa) registre despesas operacionais via RPC SECURITY DEFINER

create or replace function public.create_operational_expense(
  target_clinica_id uuid,
  expense_description text,
  expense_value numeric,
  expense_category text,
  expense_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id uuid;
begin
  if not public.is_clinic_staff(target_clinica_id) then
    raise exception 'Acesso negado';
  end if;

  insert into public.despesas (
    clinica_id, descricao, categoria, valor, status, data, created_by
  ) values (
    target_clinica_id,
    expense_description,
    expense_category,
    expense_value,
    'pago',
    expense_date,
    auth.uid()
  )
  returning id into created_id;

  return created_id;
end;
$$;

revoke execute on function public.create_operational_expense(uuid, text, numeric, text, date) from anon;
grant execute on function public.create_operational_expense(uuid, text, numeric, text, date) to authenticated;
