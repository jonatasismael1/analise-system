alter table public.agendamentos
  add column if not exists lembrete_whatsapp_enviado_em timestamptz,
  add column if not exists lembrete_whatsapp_status text
    check (lembrete_whatsapp_status is null or lembrete_whatsapp_status in ('processando','enviado','erro','ignorado')),
  add column if not exists lembrete_whatsapp_erro text,
  add column if not exists lembrete_whatsapp_tentativas int not null default 0
    check (lembrete_whatsapp_tentativas >= 0);

create index if not exists idx_agendamentos_lembrete_whatsapp_pendente
  on public.agendamentos(clinica_id, data, horario)
  where lembrete_whatsapp_enviado_em is null
    and status in ('pendente','confirmado');
