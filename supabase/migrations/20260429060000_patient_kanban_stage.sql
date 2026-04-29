alter table public.pacientes
  add column if not exists kanban_stage text
  check (
    kanban_stage is null
    or kanban_stage in ('novo','agendado','atendido','retorno','faltou','inativo')
  );

create index if not exists idx_pacientes_clinica_kanban_stage
  on public.pacientes(clinica_id, kanban_stage);
