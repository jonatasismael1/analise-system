-- ────────────────────────────────────────────────────────────────────────────
-- Teleconsultações — Whereby Embedded
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Adiciona tipo_atendimento à tabela de agendamentos
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS tipo_atendimento text NOT NULL DEFAULT 'presencial'
  CHECK (tipo_atendimento IN ('presencial', 'teleconsulta'));

-- 2. Tabela principal de teleconsultas
CREATE TABLE IF NOT EXISTS public.teleconsultations (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id              uuid        NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  appointment_id          uuid        NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  patient_id              uuid        REFERENCES public.pacientes(id),
  professional_id         uuid        REFERENCES public.profissionais(id),

  -- Whereby
  whereby_meeting_id      text,
  whereby_room_url        text,
  whereby_host_room_url   text,
  provider                text        NOT NULL DEFAULT 'whereby',

  -- Status da sala
  status                  text        NOT NULL DEFAULT 'agendada'
    CHECK (status IN (
      'agendada','sala_criada','link_enviado',
      'consentimento_pendente','consentimento_aceito',
      'aguardando_paciente','em_atendimento',
      'finalizada','cancelada','erro_sala'
    )),

  -- Acesso do paciente (token único, aleatório)
  patient_access_token    uuid        NOT NULL DEFAULT gen_random_uuid(),
  patient_access_url      text,
  token_expires_at        timestamptz,

  -- Consentimento LGPD
  consent_status          text        NOT NULL DEFAULT 'pendente'
    CHECK (consent_status IN ('pendente', 'aceito')),
  consent_accepted_at     timestamptz,

  -- Rastreamento de eventos
  link_sent_at            timestamptz,
  patient_joined_at       timestamptz,
  professional_joined_at  timestamptz,
  started_at              timestamptz,
  finished_at             timestamptz,

  error_message           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  -- Apenas uma teleconsulta ativa por agendamento
  UNIQUE (appointment_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS teleconsultations_clinica_id_idx
  ON public.teleconsultations (clinica_id);

CREATE INDEX IF NOT EXISTS teleconsultations_token_idx
  ON public.teleconsultations (patient_access_token);

-- RLS
ALTER TABLE public.teleconsultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teleconsultations_clinic_select"
  ON public.teleconsultations FOR SELECT
  USING (
    clinica_id IN (
      SELECT id FROM public.clinicas WHERE user_id = auth.uid()
      UNION
      SELECT clinica_id FROM public.usuarios
        WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "teleconsultations_clinic_insert"
  ON public.teleconsultations FOR INSERT
  WITH CHECK (
    clinica_id IN (
      SELECT id FROM public.clinicas WHERE user_id = auth.uid()
      UNION
      SELECT clinica_id FROM public.usuarios
        WHERE user_id = auth.uid() AND ativo = true
    )
  );

CREATE POLICY "teleconsultations_clinic_update"
  ON public.teleconsultations FOR UPDATE
  USING (
    clinica_id IN (
      SELECT id FROM public.clinicas WHERE user_id = auth.uid()
      UNION
      SELECT clinica_id FROM public.usuarios
        WHERE user_id = auth.uid() AND ativo = true
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- RPCs públicas (SECURITY DEFINER — sem autenticação, acessadas pelo paciente)
-- ────────────────────────────────────────────────────────────────────────────

-- Retorna dados básicos da consulta pelo token do paciente
CREATE OR REPLACE FUNCTION public.get_teleconsulta_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id',                t.id,
    'appointment_id',    t.appointment_id,
    'whereby_room_url',  t.whereby_room_url,
    'status',            t.status,
    'consent_status',    t.consent_status,
    'token_expires_at',  t.token_expires_at,
    'patient_name',      a.paciente_nome,
    'professional_name', p.nome,
    'date',              a.data,
    'time',              a.horario,
    'clinic_name',       c.nome,
    'service_name',      COALESCE(s.nome, '')
  ) INTO v_result
  FROM public.teleconsultations t
  JOIN public.agendamentos  a ON a.id = t.appointment_id
  JOIN public.profissionais p ON p.id = t.professional_id
  JOIN public.clinicas      c ON c.id = t.clinica_id
  LEFT JOIN public.servicos s ON s.id = a.servico_id
  WHERE t.patient_access_token = p_token
    AND t.status NOT IN ('cancelada', 'finalizada')
    AND (t.token_expires_at IS NULL OR t.token_expires_at > now());

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Token inválido ou expirado';
  END IF;

  RETURN v_result;
END;
$$;

-- Registra aceite do consentimento e retorna roomUrl
CREATE OR REPLACE FUNCTION public.accept_teleconsulta_consent(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.teleconsultations;
BEGIN
  UPDATE public.teleconsultations
  SET
    consent_status      = 'aceito',
    consent_accepted_at = now(),
    status              = 'consentimento_aceito',
    updated_at          = now()
  WHERE patient_access_token = p_token
    AND status NOT IN ('cancelada', 'finalizada')
    AND (token_expires_at IS NULL OR token_expires_at > now())
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido ou já registrado';
  END IF;

  RETURN jsonb_build_object(
    'id',               v_row.id,
    'whereby_room_url', v_row.whereby_room_url,
    'consent_status',   v_row.consent_status
  );
END;
$$;

-- Registra que o paciente entrou na sala
CREATE OR REPLACE FUNCTION public.record_patient_joined(p_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.teleconsultations
  SET
    patient_joined_at = COALESCE(patient_joined_at, now()),
    status = CASE
      WHEN status IN ('consentimento_aceito', 'sala_criada', 'link_enviado')
        THEN 'aguardando_paciente'
      ELSE status
    END,
    updated_at = now()
  WHERE patient_access_token = p_token
    AND status NOT IN ('cancelada', 'finalizada');
END;
$$;
