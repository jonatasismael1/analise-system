-- Módulo de programas de desconto (pacotes/combos de serviços)
create table if not exists public.programas_desconto (
  id               uuid primary key default gen_random_uuid(),
  clinica_id       uuid not null references public.clinicas(id) on delete cascade,
  nome             text not null,
  descricao        text,
  valor_total      numeric not null default 0,
  valor_com_desconto numeric not null default 0,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.programas_desconto_servicos (
  id               uuid primary key default gen_random_uuid(),
  programa_id      uuid not null references public.programas_desconto(id) on delete cascade,
  clinica_id       uuid not null references public.clinicas(id) on delete cascade,
  servico_id       uuid references public.servicos(id) on delete set null,
  nome_servico     text not null,
  descricao        text,
  preco_individual numeric not null default 0,
  ordem            integer not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.programas_desconto enable row level security;
alter table public.programas_desconto_servicos enable row level security;

create policy "programas desconto staff all"
  on public.programas_desconto for all
  using (public.is_clinic_staff(clinica_id))
  with check (public.is_clinic_staff(clinica_id));

create policy "programas desconto servicos staff all"
  on public.programas_desconto_servicos for all
  using (public.is_clinic_staff(clinica_id))
  with check (public.is_clinic_staff(clinica_id));
