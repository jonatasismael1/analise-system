-- Migration for Internal Notifications
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  tipo text not null,
  mensagem text not null,
  link text,
  lida boolean not null default false,
  criada_em timestamptz not null default now()
);

create table if not exists public.notificacao_prefs (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email_resumo_diario boolean not null default true,
  tipos_ativos text[] default '{consultas_nao_confirmadas,pagamentos_vencendo,pacientes_inativos}'
);

create index if not exists idx_notificacoes_clinica_lida on public.notificacoes(clinica_id, lida);
create index if not exists idx_notificacao_prefs_user on public.notificacao_prefs(user_id);

alter table public.notificacoes enable row level security;
alter table public.notificacao_prefs enable row level security;

drop policy if exists "notificacoes owner all" on public.notificacoes;
create policy "notificacoes owner all" on public.notificacoes
  for all to authenticated
  using (public.is_clinic_member(clinica_id))
  with check (public.is_clinic_member(clinica_id));

drop policy if exists "notificacao_prefs owner all" on public.notificacao_prefs;
create policy "notificacao_prefs owner all" on public.notificacao_prefs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
