-- Observações internas por conversa WhatsApp (notas da equipe, não enviadas ao paciente)
create table if not exists public.whatsapp_observacoes (
  id            uuid primary key default gen_random_uuid(),
  clinica_id    uuid not null references public.clinicas(id) on delete cascade,
  conversa_id   uuid not null references public.whatsapp_conversas(id) on delete cascade,
  texto         text not null,
  usuario_nome  text,
  arquivado     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.whatsapp_observacoes enable row level security;

create policy "observacoes staff all"
  on public.whatsapp_observacoes for all
  using (public.is_clinic_staff(clinica_id));
