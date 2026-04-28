alter table public.profissionais add column if not exists email text;
alter table public.profissionais add column if not exists telefone text;
alter table public.profissionais add column if not exists registro text;
alter table public.profissionais add column if not exists conselho text;

alter table public.pacientes add column if not exists cpf text;
alter table public.pacientes add column if not exists data_nascimento date;
alter table public.pacientes add column if not exists endereco text;

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  profissional_id uuid references public.profissionais(id) on delete set null,
  nome text not null,
  email text not null,
  role text not null default 'secretaria' check (role in ('admin','profissional','secretaria')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinica_id, email)
);

create index if not exists idx_usuarios_clinica_role on public.usuarios(clinica_id, role);
create index if not exists idx_usuarios_user_id on public.usuarios(user_id);
create index if not exists idx_usuarios_profissional_id on public.usuarios(profissional_id);

insert into public.usuarios (clinica_id, user_id, nome, email, role, ativo)
select c.id, c.user_id, c.nome, c.email, 'admin', true
from public.clinicas c
where c.user_id is not null
on conflict do nothing;

drop trigger if exists set_usuarios_updated_at on public.usuarios;
create trigger set_usuarios_updated_at before update on public.usuarios for each row execute function public.set_updated_at();

alter table public.usuarios enable row level security;

create schema if not exists private;

create or replace function private.current_role_for_clinic(target_clinica_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.clinicas c
      where c.id = target_clinica_id and c.user_id = auth.uid()
    ) then 'admin'
    else (
      select u.role
      from public.usuarios u
      where u.clinica_id = target_clinica_id
        and u.user_id = auth.uid()
        and u.ativo = true
      limit 1
    )
  end;
$$;

create or replace function private.current_profissional_id(target_clinica_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.profissional_id
  from public.usuarios u
  where u.clinica_id = target_clinica_id
    and u.user_id = auth.uid()
    and u.ativo = true
  limit 1;
$$;

create or replace function public.is_clinic_member(target_clinica_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.current_role_for_clinic(target_clinica_id) is not null;
$$;

create or replace function public.is_clinic_admin(target_clinica_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.current_role_for_clinic(target_clinica_id) = 'admin';
$$;

create or replace function public.is_clinic_staff(target_clinica_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.current_role_for_clinic(target_clinica_id) in ('admin','secretaria');
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_role_for_clinic(uuid) to authenticated;
grant execute on function private.current_profissional_id(uuid) to authenticated;

drop policy if exists "usuarios owner all" on public.usuarios;
create policy "usuarios owner all" on public.usuarios
for all to authenticated
using (public.is_clinic_admin(clinica_id))
with check (public.is_clinic_admin(clinica_id));

drop policy if exists "usuarios self select" on public.usuarios;
create policy "usuarios self select" on public.usuarios
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "clinicas member select" on public.clinicas;
create policy "clinicas member select" on public.clinicas
for select to authenticated
using (public.is_clinic_member(id));

drop policy if exists "clinicas admin update" on public.clinicas;
create policy "clinicas admin update" on public.clinicas
for update to authenticated
using (public.is_clinic_admin(id))
with check (public.is_clinic_admin(id));

drop policy if exists "profissionais owner all" on public.profissionais;
drop policy if exists "profissionais staff all" on public.profissionais;
create policy "profissionais staff all" on public.profissionais
for all to authenticated
using (public.is_clinic_staff(clinica_id))
with check (public.is_clinic_staff(clinica_id));
drop policy if exists "profissionais professional self read" on public.profissionais;
create policy "profissionais professional self read" on public.profissionais
for select to authenticated
using (id = private.current_profissional_id(clinica_id));

drop policy if exists "servicos owner all" on public.servicos;
drop policy if exists "servicos staff all" on public.servicos;
create policy "servicos staff all" on public.servicos
for all to authenticated
using (public.is_clinic_staff(clinica_id))
with check (public.is_clinic_staff(clinica_id));
drop policy if exists "servicos professional read" on public.servicos;
create policy "servicos professional read" on public.servicos
for select to authenticated
using (profissional_id = private.current_profissional_id(clinica_id));

drop policy if exists "pacientes owner all" on public.pacientes;
drop policy if exists "pacientes staff all" on public.pacientes;
create policy "pacientes staff all" on public.pacientes
for all to authenticated
using (public.is_clinic_staff(clinica_id))
with check (public.is_clinic_staff(clinica_id));
drop policy if exists "pacientes professional read" on public.pacientes;
create policy "pacientes professional read" on public.pacientes
for select to authenticated
using (profissional_id = private.current_profissional_id(clinica_id));

drop policy if exists "agendamentos owner all" on public.agendamentos;
drop policy if exists "agendamentos staff all" on public.agendamentos;
create policy "agendamentos staff all" on public.agendamentos
for all to authenticated
using (public.is_clinic_staff(clinica_id))
with check (public.is_clinic_staff(clinica_id));
drop policy if exists "agendamentos professional read" on public.agendamentos;
create policy "agendamentos professional read" on public.agendamentos
for select to authenticated
using (profissional_id = private.current_profissional_id(clinica_id));

drop policy if exists "pacotes owner all" on public.pacotes_sessoes;
drop policy if exists "pacotes staff all" on public.pacotes_sessoes;
create policy "pacotes staff all" on public.pacotes_sessoes
for all to authenticated
using (public.is_clinic_staff(clinica_id))
with check (public.is_clinic_staff(clinica_id));

drop policy if exists "pagamentos owner all" on public.pagamentos;
drop policy if exists "pagamentos admin all" on public.pagamentos;
create policy "pagamentos admin all" on public.pagamentos
for all to authenticated
using (public.is_clinic_admin(clinica_id))
with check (public.is_clinic_admin(clinica_id));

drop policy if exists "despesas owner all" on public.despesas;
drop policy if exists "despesas admin all" on public.despesas;
create policy "despesas admin all" on public.despesas
for all to authenticated
using (public.is_clinic_admin(clinica_id))
with check (public.is_clinic_admin(clinica_id));
