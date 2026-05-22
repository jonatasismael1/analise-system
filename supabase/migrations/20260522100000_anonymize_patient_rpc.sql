-- =============================================================================
-- LGPD: RPC de anonimização de paciente (direito ao esquecimento — Art. 18)
-- =============================================================================
--
-- Garante que apenas admins da clínica podem chamar a função.
-- Sobrescreve dados pessoais sensíveis, mantendo o registro para integridade
-- de referências (agendamentos, pagamentos, prontuários continuam existindo).
-- =============================================================================

create or replace function public.anonimizar_paciente(
  p_patient_id  uuid,
  p_clinica_id  uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
begin
  -- Verifica se o chamador é admin desta clínica
  select exists(
    select 1 from public.usuarios
    where clinica_id = p_clinica_id
      and user_id    = v_user_id
      and role       = 'admin'
      and ativo      = true
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Permissão negada: apenas administradores podem anonimizar pacientes.';
  end if;

  -- Verifica que o paciente pertence a esta clínica
  if not exists(
    select 1 from public.pacientes
    where id         = p_patient_id
      and clinica_id = p_clinica_id
  ) then
    raise exception 'Paciente não encontrado nesta clínica.';
  end if;

  -- Sobrescreve todos os campos pessoais identificáveis
  update public.pacientes set
    nome             = 'Paciente Anonimizado',
    whatsapp         = '00000000000',
    email            = null,
    cpf              = null,
    data_nascimento  = null,
    endereco         = null,
    observacoes      = null,
    updated_at       = now()
  where id         = p_patient_id
    and clinica_id = p_clinica_id;

  -- Registra a ação de anonimização no log de acessos
  insert into public.prontuario_acessos (clinica_id, prontuario_id, user_id, acao)
  select p_clinica_id, id, v_user_id, 'anonimizacao'
  from public.prontuarios
  where paciente_id = p_patient_id
    and clinica_id  = p_clinica_id
  limit 1;

end;
$$;

-- Apenas usuários autenticados podem chamar (a lógica interna já verifica o role)
grant execute on function public.anonimizar_paciente(uuid, uuid) to authenticated;
revoke execute on function public.anonimizar_paciente(uuid, uuid) from anon;
