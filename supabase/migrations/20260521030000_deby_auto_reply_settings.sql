-- Alinha as configuracoes da Deby AI com a tabela ativa do chat Evolution.
-- O front usa public.whatsapp_conversas; a FK antiga podia apontar para public.whatsapp_conversations.

do $$
declare
  constraint_name text;
begin
  if to_regclass('public.ai_conversation_settings') is null then
    return;
  end if;

  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid = 'public.ai_conversation_settings'::regclass
      and c.contype = 'f'
      and a.attname = 'conversation_id'
  loop
    execute format('alter table public.ai_conversation_settings drop constraint %I', constraint_name);
  end loop;
end $$;

delete from public.ai_conversation_settings s
where not exists (
  select 1
  from public.whatsapp_conversas c
  where c.id = s.conversation_id
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_conversation_settings_conversa_id_fkey'
      and conrelid = 'public.ai_conversation_settings'::regclass
  ) then
    alter table public.ai_conversation_settings
      add constraint ai_conversation_settings_conversa_id_fkey
      foreign key (conversation_id)
      references public.whatsapp_conversas(id)
      on delete cascade;
  end if;
end $$;

create index if not exists idx_ai_conversation_settings_clinic_conversa
  on public.ai_conversation_settings(clinic_id, conversation_id);
