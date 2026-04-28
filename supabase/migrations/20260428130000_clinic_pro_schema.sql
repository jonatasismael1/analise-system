create extension if not exists pgcrypto;

create table if not exists public.clinicas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  email text not null unique,
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profissionais (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nome text not null,
  especialidade text not null default '',
  foto_url text,
  horarios jsonb not null default '{"dias":[1,2,3,4,5],"inicio":"08:00","fim":"18:00","intervalo_min":30}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  profissional_id uuid references public.profissionais(id) on delete set null,
  nome text not null,
  duracao_min int not null default 30 check (duracao_min > 0),
  preco numeric(12,2) not null default 0 check (preco >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nome text not null,
  whatsapp text not null,
  email text,
  status text not null default 'ativo' check (status in ('ativo','inativo','retorno_pendente')),
  profissional_id uuid references public.profissionais(id) on delete set null,
  ultimo_atendimento date,
  proximo_retorno date,
  valor_total_gasto numeric(12,2) not null default 0 check (valor_total_gasto >= 0),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  servico_id uuid references public.servicos(id) on delete set null,
  paciente_id uuid references public.pacientes(id) on delete set null,
  paciente_nome text not null,
  paciente_whatsapp text not null,
  data date not null,
  horario time not null,
  status text not null default 'pendente' check (status in ('pendente','confirmado','cancelado','faltou','concluido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agendamentos_profissional_data_horario_unique unique (profissional_id, data, horario)
);

create table if not exists public.pacotes_sessoes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  paciente_id uuid references public.pacientes(id) on delete set null,
  servico_id uuid references public.servicos(id) on delete set null,
  total_sessoes int not null default 1 check (total_sessoes > 0),
  sessoes_realizadas int not null default 0 check (sessoes_realizadas >= 0),
  validade date,
  status text not null default 'ativo' check (status in ('ativo','finalizado','vencido','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sessoes_realizadas <= total_sessoes)
);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  paciente_id uuid references public.pacientes(id) on delete set null,
  servico_id uuid references public.servicos(id) on delete set null,
  profissional_id uuid references public.profissionais(id) on delete set null,
  valor numeric(12,2) not null default 0 check (valor >= 0),
  data_vencimento date,
  data_pagamento date,
  status text not null default 'pendente' check (status in ('pago','pendente','atrasado','cancelado')),
  forma_pagamento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  descricao text not null,
  categoria text,
  valor numeric(12,2) not null default 0 check (valor >= 0),
  data date not null default current_date,
  status text not null default 'pendente' check (status in ('pago','pendente','atrasado','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clinicas_user_id on public.clinicas(user_id);
create index if not exists idx_clinicas_slug on public.clinicas(slug);
create index if not exists idx_profissionais_clinica_ativo on public.profissionais(clinica_id, ativo);
create index if not exists idx_servicos_clinica_profissional_ativo on public.servicos(clinica_id, profissional_id, ativo);
create index if not exists idx_pacientes_clinica_status on public.pacientes(clinica_id, status);
create index if not exists idx_agendamentos_clinica_data on public.agendamentos(clinica_id, data);
create index if not exists idx_pagamentos_clinica_status on public.pagamentos(clinica_id, status);
create index if not exists idx_despesas_clinica_data on public.despesas(clinica_id, data);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_clinicas_updated_at on public.clinicas;
create trigger set_clinicas_updated_at before update on public.clinicas for each row execute function public.set_updated_at();
drop trigger if exists set_profissionais_updated_at on public.profissionais;
create trigger set_profissionais_updated_at before update on public.profissionais for each row execute function public.set_updated_at();
drop trigger if exists set_servicos_updated_at on public.servicos;
create trigger set_servicos_updated_at before update on public.servicos for each row execute function public.set_updated_at();
drop trigger if exists set_pacientes_updated_at on public.pacientes;
create trigger set_pacientes_updated_at before update on public.pacientes for each row execute function public.set_updated_at();
drop trigger if exists set_agendamentos_updated_at on public.agendamentos;
create trigger set_agendamentos_updated_at before update on public.agendamentos for each row execute function public.set_updated_at();
drop trigger if exists set_pacotes_sessoes_updated_at on public.pacotes_sessoes;
create trigger set_pacotes_sessoes_updated_at before update on public.pacotes_sessoes for each row execute function public.set_updated_at();
drop trigger if exists set_pagamentos_updated_at on public.pagamentos;
create trigger set_pagamentos_updated_at before update on public.pagamentos for each row execute function public.set_updated_at();
drop trigger if exists set_despesas_updated_at on public.despesas;
create trigger set_despesas_updated_at before update on public.despesas for each row execute function public.set_updated_at();

alter table public.clinicas enable row level security;
alter table public.profissionais enable row level security;
alter table public.servicos enable row level security;
alter table public.pacientes enable row level security;
alter table public.agendamentos enable row level security;
alter table public.pacotes_sessoes enable row level security;
alter table public.pagamentos enable row level security;
alter table public.despesas enable row level security;

create or replace function public.is_clinic_member(target_clinica_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.clinicas c
    where c.id = target_clinica_id and c.user_id = auth.uid()
  );
$$;

drop policy if exists "clinicas owner select" on public.clinicas;
create policy "clinicas owner select" on public.clinicas for select to authenticated using (user_id = auth.uid());
drop policy if exists "clinicas owner update" on public.clinicas;
create policy "clinicas owner update" on public.clinicas for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "clinicas public booking read" on public.clinicas;
create policy "clinicas public booking read" on public.clinicas for select to anon using (true);

drop policy if exists "profissionais owner all" on public.profissionais;
create policy "profissionais owner all" on public.profissionais for all to authenticated using (public.is_clinic_member(clinica_id)) with check (public.is_clinic_member(clinica_id));
drop policy if exists "profissionais public active read" on public.profissionais;
create policy "profissionais public active read" on public.profissionais for select to anon using (ativo = true);

drop policy if exists "servicos owner all" on public.servicos;
create policy "servicos owner all" on public.servicos for all to authenticated using (public.is_clinic_member(clinica_id)) with check (public.is_clinic_member(clinica_id));
drop policy if exists "servicos public active read" on public.servicos;
create policy "servicos public active read" on public.servicos for select to anon using (ativo = true);

drop policy if exists "pacientes owner all" on public.pacientes;
create policy "pacientes owner all" on public.pacientes for all to authenticated using (public.is_clinic_member(clinica_id)) with check (public.is_clinic_member(clinica_id));
drop policy if exists "pacientes public insert booking" on public.pacientes;
create policy "pacientes public insert booking" on public.pacientes for insert to anon with check (true);

drop policy if exists "agendamentos owner all" on public.agendamentos;
create policy "agendamentos owner all" on public.agendamentos for all to authenticated using (public.is_clinic_member(clinica_id)) with check (public.is_clinic_member(clinica_id));
drop policy if exists "agendamentos public occupied read" on public.agendamentos;
create policy "agendamentos public occupied read" on public.agendamentos for select to anon using (status in ('pendente','confirmado'));
drop policy if exists "agendamentos public insert" on public.agendamentos;
create policy "agendamentos public insert" on public.agendamentos for insert to anon with check (status = 'pendente');

drop policy if exists "pacotes owner all" on public.pacotes_sessoes;
create policy "pacotes owner all" on public.pacotes_sessoes for all to authenticated using (public.is_clinic_member(clinica_id)) with check (public.is_clinic_member(clinica_id));
drop policy if exists "pagamentos owner all" on public.pagamentos;
create policy "pagamentos owner all" on public.pagamentos for all to authenticated using (public.is_clinic_member(clinica_id)) with check (public.is_clinic_member(clinica_id));
drop policy if exists "despesas owner all" on public.despesas;
create policy "despesas owner all" on public.despesas for all to authenticated using (public.is_clinic_member(clinica_id)) with check (public.is_clinic_member(clinica_id));
