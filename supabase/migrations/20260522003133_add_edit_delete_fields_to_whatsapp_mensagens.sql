-- Suporte a edição e exclusão de mensagens WhatsApp (soft-delete com auditoria)
alter table public.whatsapp_mensagens
  add column if not exists is_deleted     boolean not null default false,
  add column if not exists deleted_at     timestamptz,
  add column if not exists deleted_by     text,
  add column if not exists delete_origin  text,
  add column if not exists is_edited      boolean not null default false,
  add column if not exists edited_at      timestamptz,
  add column if not exists edit_origin    text,
  add column if not exists original_content text;

-- Índice parcial para consultas de mensagens excluídas (auditoria)
create index if not exists idx_whatsapp_mensagens_is_deleted
  on public.whatsapp_mensagens (clinica_id, conversa_id, is_deleted)
  where is_deleted = true;
