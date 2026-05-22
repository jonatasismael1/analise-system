-- v2 do caixa operacional: inclui despesas junto com pagamentos

create or replace function public.get_operational_cash(
  target_clinica_id uuid,
  start_date date,
  end_date date
)
returns table (
  id uuid,
  descricao text,
  valor numeric,
  status text,
  data date,
  forma_pagamento text,
  tipo text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    coalesce(p.descricao, 'Pagamento') as descricao,
    p.valor,
    p.status,
    coalesce(p.data_pagamento, p.data_vencimento, p.created_at::date) as data,
    p.forma_pagamento,
    'pagamento'::text as tipo
  from public.pagamentos p
  where p.clinica_id = target_clinica_id
    and public.is_clinic_staff(target_clinica_id)
    and coalesce(p.data_pagamento, p.data_vencimento, p.created_at::date) between start_date and end_date
    and p.status <> 'cancelado'

  union all

  select
    d.id,
    d.descricao,
    d.valor,
    d.status,
    d.data,
    null::text as forma_pagamento,
    'despesa'::text as tipo
  from public.despesas d
  where d.clinica_id = target_clinica_id
    and public.is_clinic_staff(target_clinica_id)
    and d.data between start_date and end_date
    and d.status <> 'cancelado'

  order by data desc;
$$;

create or replace function public.create_operational_expense(
  target_clinica_id uuid,
  expense_description text,
  expense_category text,
  expense_value numeric,
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

create or replace function public.close_cash_register(
  target_clinica_id uuid,
  cash_date date,
  notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  received numeric;
  pending numeric;
  closing_id uuid;
begin
  if not public.is_clinic_staff(target_clinica_id) then
    raise exception 'Acesso negado';
  end if;

  select coalesce(sum(valor) filter (where status = 'pago'), 0),
         coalesce(sum(valor) filter (where status in ('pendente','atrasado')), 0)
    into received, pending
  from public.pagamentos
  where clinica_id = target_clinica_id
    and coalesce(data_pagamento, data_vencimento, created_at::date) = cash_date;

  insert into public.fechamentos_caixa (clinica_id, data, total_recebido, total_pendente, observacoes, fechado_por)
  values (target_clinica_id, cash_date, received, pending, notes, auth.uid())
  on conflict (clinica_id, data)
  do update set total_recebido = excluded.total_recebido,
                total_pendente = excluded.total_pendente,
                observacoes = excluded.observacoes,
                fechado_por = excluded.fechado_por,
                updated_at = now()
  returning id into closing_id;

  return closing_id;
end;
$$;
