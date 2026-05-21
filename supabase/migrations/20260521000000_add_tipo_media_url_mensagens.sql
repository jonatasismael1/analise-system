-- Adiciona colunas tipo e media_url em whatsapp_mensagens
-- Necessário para exibir imagens, áudios e documentos no chat

ALTER TABLE whatsapp_mensagens
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- contato_id pode ser null em conversas criadas manualmente
ALTER TABLE whatsapp_mensagens
  ALTER COLUMN contato_id DROP NOT NULL;
