alter table public.agendamentos
  add column if not exists recorrencia_id uuid;

create index if not exists idx_agendamentos_recorrencia_id
  on public.agendamentos(recorrencia_id)
  where recorrencia_id is not null;
