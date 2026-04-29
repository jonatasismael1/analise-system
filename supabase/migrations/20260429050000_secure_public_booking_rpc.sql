-- Lock down public booking access behind narrow RPC functions.
-- The public page needs clinic/professional/service basics, occupied slots and
-- appointment creation, but it should not receive direct table access.

create schema if not exists private;

create or replace function private.get_public_booking_data(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'clinic', jsonb_build_object(
      'id', c.id,
      'nome', c.nome,
      'slug', c.slug
    ),
    'professionals', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'clinica_id', p.clinica_id,
          'nome', p.nome,
          'especialidade', p.especialidade,
          'foto_url', p.foto_url,
          'horarios', p.horarios,
          'ativo', p.ativo
        )
        order by p.nome
      )
      from public.profissionais p
      where p.clinica_id = c.id
        and p.ativo = true
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'clinica_id', s.clinica_id,
          'profissional_id', s.profissional_id,
          'nome', s.nome,
          'duracao_min', s.duracao_min,
          'preco', s.preco,
          'ativo', s.ativo
        )
        order by s.nome
      )
      from public.servicos s
      where s.clinica_id = c.id
        and s.ativo = true
    ), '[]'::jsonb)
  )
  from public.clinicas c
  where c.slug = p_slug
  limit 1;
$$;

create or replace function public.get_public_booking_data(p_slug text)
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.get_public_booking_data(p_slug);
$$;

create or replace function private.get_public_occupied_slots(
  p_slug text,
  p_profissional_id uuid,
  p_data date
)
returns table (horario time)
language sql
stable
security definer
set search_path = public
as $$
  select a.horario
  from public.clinicas c
  join public.profissionais p
    on p.clinica_id = c.id
   and p.id = p_profissional_id
   and p.ativo = true
  join public.agendamentos a
    on a.clinica_id = c.id
   and a.profissional_id = p.id
  where c.slug = p_slug
    and a.data = p_data
    and a.status in ('pendente', 'confirmado')
  order by a.horario;
$$;

create or replace function public.get_public_occupied_slots(
  p_slug text,
  p_profissional_id uuid,
  p_data date
)
returns table (horario time)
language sql
stable
security invoker
set search_path = public, private
as $$
  select * from private.get_public_occupied_slots(p_slug, p_profissional_id, p_data);
$$;

create or replace function private.create_public_booking(
  p_slug text,
  p_profissional_id uuid,
  p_servico_id uuid,
  p_paciente_nome text,
  p_paciente_whatsapp text,
  p_paciente_email text,
  p_data date,
  p_horario time
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinica_id uuid;
  v_paciente_id uuid;
  v_agendamento_id uuid;
  v_nome text := nullif(trim(p_paciente_nome), '');
  v_whatsapp text := regexp_replace(coalesce(p_paciente_whatsapp, ''), '\D', '', 'g');
  v_email text := nullif(trim(p_paciente_email), '');
begin
  if v_nome is null or length(v_nome) < 3 then
    raise exception 'invalid_patient_name' using errcode = '22023';
  end if;

  if length(v_whatsapp) < 10 then
    raise exception 'invalid_patient_whatsapp' using errcode = '22023';
  end if;

  if p_data < current_date then
    raise exception 'invalid_booking_date' using errcode = '22023';
  end if;

  select c.id
    into v_clinica_id
  from public.clinicas c
  join public.profissionais p
    on p.clinica_id = c.id
   and p.id = p_profissional_id
   and p.ativo = true
  join public.servicos s
    on s.clinica_id = c.id
   and s.id = p_servico_id
   and s.ativo = true
   and (s.profissional_id is null or s.profissional_id = p_profissional_id)
  where c.slug = p_slug
  limit 1;

  if v_clinica_id is null then
    raise exception 'invalid_booking_selection' using errcode = '22023';
  end if;

  insert into public.pacientes (
    clinica_id,
    nome,
    whatsapp,
    email,
    status,
    profissional_id
  ) values (
    v_clinica_id,
    v_nome,
    v_whatsapp,
    v_email,
    'ativo',
    p_profissional_id
  )
  returning id into v_paciente_id;

  insert into public.agendamentos (
    clinica_id,
    profissional_id,
    servico_id,
    paciente_id,
    paciente_nome,
    paciente_whatsapp,
    data,
    horario,
    status
  ) values (
    v_clinica_id,
    p_profissional_id,
    p_servico_id,
    v_paciente_id,
    v_nome,
    v_whatsapp,
    p_data,
    p_horario,
    'pendente'
  )
  returning id into v_agendamento_id;

  return v_agendamento_id;
exception
  when unique_violation then
    raise exception 'slot_unavailable' using errcode = '23505';
end;
$$;

create or replace function public.create_public_booking(
  p_slug text,
  p_profissional_id uuid,
  p_servico_id uuid,
  p_paciente_nome text,
  p_paciente_whatsapp text,
  p_paciente_email text,
  p_data date,
  p_horario time
)
returns uuid
language sql
volatile
security invoker
set search_path = public, private
as $$
  select private.create_public_booking(
    p_slug,
    p_profissional_id,
    p_servico_id,
    p_paciente_nome,
    p_paciente_whatsapp,
    p_paciente_email,
    p_data,
    p_horario
  );
$$;

grant execute on function public.get_public_booking_data(text) to anon, authenticated;
grant execute on function public.get_public_occupied_slots(text, uuid, date) to anon, authenticated;
grant execute on function public.create_public_booking(text, uuid, uuid, text, text, text, date, time) to anon, authenticated;

grant usage on schema private to anon, authenticated;
grant execute on function private.get_public_booking_data(text) to anon, authenticated;
grant execute on function private.get_public_occupied_slots(text, uuid, date) to anon, authenticated;
grant execute on function private.create_public_booking(text, uuid, uuid, text, text, text, date, time) to anon, authenticated;

drop policy if exists "clinicas public booking read" on public.clinicas;
drop policy if exists "profissionais public active read" on public.profissionais;
drop policy if exists "servicos public active read" on public.servicos;
drop policy if exists "pacientes public insert booking" on public.pacientes;
drop policy if exists "agendamentos public occupied read" on public.agendamentos;
drop policy if exists "agendamentos public insert" on public.agendamentos;
