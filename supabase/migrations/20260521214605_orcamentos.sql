-- Módulo de orçamentos com token público para compartilhamento
create table if not exists public.orcamentos (
  id                  uuid primary key default gen_random_uuid(),
  clinica_id          uuid not null references public.clinicas(id) on delete cascade,
  paciente_id         uuid references public.pacientes(id) on delete set null,
  paciente_nome       text not null,
  paciente_cpf        text,
  paciente_whatsapp   text,
  atendente_nome      text not null default '',
  observacoes         text,
  valor_total         numeric not null default 0,
  valor_com_desconto  numeric,
  token_publico       text not null default encode(gen_random_bytes(16), 'hex'),
  status              text not null default 'ativo',
  validade            date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.orcamentos_itens (
  id               uuid primary key default gen_random_uuid(),
  orcamento_id     uuid not null references public.orcamentos(id) on delete cascade,
  clinica_id       uuid not null references public.clinicas(id) on delete cascade,
  servico_id       uuid references public.servicos(id) on delete set null,
  programa_id      uuid references public.programas_desconto(id) on delete set null,
  nome             text not null,
  descricao        text,
  preco_individual numeric not null default 0,
  quantidade       integer not null default 1,
  tipo             text not null default 'servico',
  created_at       timestamptz not null default now()
);

alter table public.orcamentos enable row level security;
alter table public.orcamentos_itens enable row level security;

create policy "orcamentos staff all"
  on public.orcamentos for all
  using (public.is_clinic_staff(clinica_id))
  with check (public.is_clinic_staff(clinica_id));

create policy "orcamentos itens staff all"
  on public.orcamentos_itens for all
  using (public.is_clinic_staff(clinica_id))
  with check (public.is_clinic_staff(clinica_id));

-- Acesso público por token (para página de visualização sem login)
create policy "orcamentos public token read"
  on public.orcamentos for select
  using (true);

create policy "orcamentos itens public read"
  on public.orcamentos_itens for select
  using (true);
