-- Adiciona colunas de push_name e profile_pic_url em whatsapp_contatos
ALTER TABLE public.whatsapp_contatos
  ADD COLUMN IF NOT EXISTS push_name TEXT,
  ADD COLUMN IF NOT EXISTS profile_pic_url TEXT,
  ADD COLUMN IF NOT EXISTS pic_fetched_at TIMESTAMPTZ;

-- Adiciona colunas de atendimento_status e unread_count em whatsapp_conversas
ALTER TABLE public.whatsapp_conversas
  ADD COLUMN IF NOT EXISTS atendimento_status TEXT NOT NULL DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS unread_count INT NOT NULL DEFAULT 0;

-- Garante que a coluna origem em whatsapp_contatos existe
ALTER TABLE public.whatsapp_contatos
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'webhook';

-- Índice para ordenação por push_name (contatos)
CREATE INDEX IF NOT EXISTS idx_whatsapp_contatos_push_name
  ON public.whatsapp_contatos (clinica_id, push_name);

-- Índice para filtrar conversas por atendimento_status
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_atendimento
  ON public.whatsapp_conversas (clinica_id, atendimento_status);
