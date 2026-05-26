create table if not exists public.fila_atendimento (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  paciente_id uuid references public.pacientes(id) on delete set null,
  profissional_id uuid references public.profissionais(id) on delete set null,
  servico_id uuid references public.servicos(id) on delete set null,
  paciente_nome text not null,
  paciente_whatsapp text,
  profissional_nome text,
  servico_nome text,
  data date not null default current_date,
  ordem integer not null default 1,
  chegada_em timestamptz not null default now(),
  status text not null default 'aguardando'
    check (status in ('aguardando','em_atendimento','finalizado','faltou','cancelado')),
  prioridade boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fila_atendimento_clinica_data_ordem
  on public.fila_atendimento(clinica_id, data, ordem);

create unique index if not exists fila_atendimento_agendamento_dia_unique
  on public.fila_atendimento(clinica_id, data, agendamento_id)
  where agendamento_id is not null;

drop trigger if exists set_fila_atendimento_updated_at on public.fila_atendimento;
create trigger set_fila_atendimento_updated_at
  before update on public.fila_atendimento
  for each row execute function public.set_updated_at();

alter table public.fila_atendimento enable row level security;

drop policy if exists "fila atendimento staff all" on public.fila_atendimento;
create policy "fila atendimento staff all"
  on public.fila_atendimento for all to authenticated
  using (public.is_clinic_staff(clinica_id))
  with check (public.is_clinic_staff(clinica_id));

drop policy if exists "fila atendimento professional read" on public.fila_atendimento;
create policy "fila atendimento professional read"
  on public.fila_atendimento for select to authenticated
  using (profissional_id = private.current_profissional_id(clinica_id));
