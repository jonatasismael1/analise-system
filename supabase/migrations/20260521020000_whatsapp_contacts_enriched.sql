-- Enriquece whatsapp_contatos com campos de perfil vindos da Evolution API
-- e adiciona contador de mensagens não lidas em whatsapp_conversas

ALTER TABLE public.whatsapp_contatos
  ADD COLUMN IF NOT EXISTS profile_pic_url  TEXT,
  ADD COLUMN IF NOT EXISTS push_name        TEXT,   -- nome do WhatsApp (mais confiável que nome manual)
  ADD COLUMN IF NOT EXISTS pic_fetched_at   TIMESTAMPTZ; -- controle de cache da foto

ALTER TABLE public.whatsapp_conversas
  ADD COLUMN IF NOT EXISTS unread_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atendimento_status TEXT NOT NULL DEFAULT 'novo'
    CHECK (atendimento_status IN ('novo','ativo','paciente','arquivado','humano'));

-- Índice para busca rápida por contatos sem foto (para fila de enriquecimento)
CREATE INDEX IF NOT EXISTS idx_whatsapp_contatos_pic
  ON public.whatsapp_contatos (clinica_id, pic_fetched_at NULLS FIRST);

-- Índice para conversas com mensagens não lidas
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_unread
  ON public.whatsapp_conversas (clinica_id, unread_count DESC)
  WHERE unread_count > 0;

-- Zera unread_count quando selecionamos a conversa (via função RPC chamada pelo frontend)
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID, p_clinic_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.whatsapp_conversas
  SET unread_count = 0
  WHERE id = p_conversation_id
    AND clinica_id = p_clinic_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID, UUID) TO authenticated;
