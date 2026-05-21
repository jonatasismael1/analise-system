-- Habilita Realtime para tabelas do WhatsApp (necessário para mensagens aparecerem em tempo real)
-- Sem isso, o frontend não recebe atualizações via postgres_changes subscription

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_mensagens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_mensagens;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_conversas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversas;
  END IF;
END;
$$;

-- Garante que contato_id em whatsapp_mensagens pode ser nulo
-- (mensagens enviadas pelo painel não têm contato_id obrigatório em todas as situações)
ALTER TABLE public.whatsapp_mensagens
  ALTER COLUMN contato_id DROP NOT NULL;

-- Adiciona as colunas tipo e media_url caso ainda não existam
-- (idempotente — só adiciona se não tiver)
ALTER TABLE public.whatsapp_mensagens
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Permite inserção de mensagens pela role service_role (webhook)
-- sem afetar a política RLS existente para usuários autenticados
DROP POLICY IF EXISTS "whatsapp mensagens service all" ON public.whatsapp_mensagens;
CREATE POLICY "whatsapp mensagens service all" ON public.whatsapp_mensagens
  FOR ALL TO service_role USING (true) WITH CHECK (true);
