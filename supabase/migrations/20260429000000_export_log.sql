-- Migration: export log + convenio field on agendamentos
-- Run with: supabase db push

-- Add convenio field to agendamentos
alter table public.agendamentos
  add column if not exists convenio text;

-- Add fornecedor + convenio to pagamentos
alter table public.pagamentos
  add column if not exists convenio text,
  add column if not exists descricao text,
  add column if not exists observacao text;

-- Add fornecedor + observacao to despesas
alter table public.despesas
  add column if not exists fornecedor text,
  add column if not exists forma_pagamento text,
  add column if not exists observacao text;

-- Export history log
create table if not exists public.export_log (
  id          uuid primary key default gen_random_uuid(),
  clinica_id  uuid not null references public.clinicas(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  tipo        text not null check (tipo in ('receitas','despesas','ambos')),
  formato     text not null check (formato in ('csv','xlsx','pdf')),
  filtros     jsonb,
  total_linhas int default 0,
  criado_em   timestamptz not null default now()
);

create index if not exists idx_export_log_clinica on public.export_log(clinica_id, criado_em desc);

alter table public.export_log enable row level security;

drop policy if exists "export_log owner all" on public.export_log;
create policy "export_log owner all" on public.export_log
  for all to authenticated
  using (public.is_clinic_member(clinica_id))
  with check (public.is_clinic_member(clinica_id));
