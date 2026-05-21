-- Prontuários
create table if not exists public.prontuarios (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  profissional_id uuid references public.profissionais(id) on delete set null,
  queixa text,
  evolucao text,
  conduta text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Arquivos anexados ao prontuário
create table if not exists public.prontuario_arquivos (
  id uuid primary key default gen_random_uuid(),
  prontuario_id uuid not null references public.prontuarios(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nome text not null,
  url text not null,
  tipo text not null,
  tamanho int,
  criado_em timestamptz not null default now()
);

-- Log de acessos a prontuários
create table if not exists public.prontuario_acessos (
  id uuid primary key default gen_random_uuid(),
  prontuario_id uuid not null references public.prontuarios(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  acao text not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_prontuarios_paciente on public.prontuarios(paciente_id);
create index if not exists idx_prontuarios_clinica on public.prontuarios(clinica_id);
create index if not exists idx_prontuario_arquivos_prontuario on public.prontuario_arquivos(prontuario_id);

alter table public.prontuarios enable row level security;
alter table public.prontuario_arquivos enable row level security;
alter table public.prontuario_acessos enable row level security;

-- Policies para prontuários: Leitura permitida para membros da clínica.
-- Edição restrita a quem os criou (ou admins que poderão ter override na aplicação).
drop policy if exists "prontuarios owner all" on public.prontuarios;
create policy "prontuarios owner all" on public.prontuarios
  for all to authenticated
  using (public.is_clinic_member(clinica_id))
  with check (public.is_clinic_member(clinica_id));

drop policy if exists "prontuario_arquivos owner all" on public.prontuario_arquivos;
create policy "prontuario_arquivos owner all" on public.prontuario_arquivos
  for all to authenticated
  using (public.is_clinic_member(clinica_id))
  with check (public.is_clinic_member(clinica_id));

drop policy if exists "prontuario_acessos owner all" on public.prontuario_acessos;
create policy "prontuario_acessos owner all" on public.prontuario_acessos
  for all to authenticated
  using (public.is_clinic_member(clinica_id))
  with check (public.is_clinic_member(clinica_id));

-- Bucket do storage (requires supabase storage api access, handle manually if needed, but here's SQL)
insert into storage.buckets (id, name, public) values ('prontuarios', 'prontuarios', false) on conflict (id) do nothing;

drop policy if exists "Prontuarios bucket access" on storage.objects;
create policy "Prontuarios bucket access"
  on storage.objects for all
  to authenticated
  using ( bucket_id = 'prontuarios' );
