create extension if not exists pgcrypto;

create table if not exists public.whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinicas(id) on delete cascade,
  instance_name text not null,
  status text not null default 'disconnected' check (status in ('connected','disconnected','qr_required','starting','error')),
  phone_number text,
  qr_code text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, instance_name)
);

create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinicas(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instances(id) on delete cascade,
  name text,
  phone text not null,
  lead_id uuid references public.leads(id) on delete set null,
  profile_pic_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, instance_id, phone)
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinicas(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instances(id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'open' check (status in ('open','pending','resolved','archived')),
  assigned_to uuid references public.usuarios(id) on delete set null,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, instance_id, contact_id)
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinicas(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instances(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  evolution_message_id text,
  direction text not null check (direction in ('in','out')),
  message_type text not null default 'text' check (message_type in ('text','image','video','audio','document','unknown')),
  content text,
  media_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  status text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.whatsapp_messages
  add column if not exists clinic_id uuid references public.clinicas(id) on delete cascade,
  add column if not exists instance_id uuid references public.whatsapp_instances(id) on delete cascade,
  add column if not exists conversation_id uuid references public.whatsapp_conversations(id) on delete cascade,
  add column if not exists evolution_message_id text,
  add column if not exists direction text,
  add column if not exists message_type text default 'text',
  add column if not exists content text,
  add column if not exists media_url text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb,
  add column if not exists status text,
  add column if not exists sent_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists idx_whatsapp_messages_evolution_message_id
  on public.whatsapp_messages(clinic_id, evolution_message_id)
  where evolution_message_id is not null;

create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinicas(id) on delete cascade,
  name text not null,
  provider text not null default 'openai',
  model text not null default 'gpt-5.2',
  system_prompt text not null default 'Voce e Deby AI, assistente de atendimento da Analise Saude. Responda em portugues do Brasil, com tom humano, claro e objetivo. Nao diagnostique, nao prometa resultados e direcione assuntos clinicos para avaliacao profissional.',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, name)
);

create table if not exists public.ai_conversation_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinicas(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  ai_enabled boolean not null default false,
  agent_id uuid references public.ai_agents(id) on delete set null,
  human_takeover boolean not null default false,
  ai_mode text not null default 'assisted' check (ai_mode in ('automatic','assisted')),
  suggested_response text,
  suggested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, conversation_id)
);

create index if not exists idx_whatsapp_instances_clinic on public.whatsapp_instances(clinic_id);
create index if not exists idx_whatsapp_contacts_clinic_instance on public.whatsapp_contacts(clinic_id, instance_id);
create index if not exists idx_whatsapp_conversations_clinic_last on public.whatsapp_conversations(clinic_id, last_message_at desc);
create index if not exists idx_whatsapp_messages_conversation_sent on public.whatsapp_messages(conversation_id, sent_at);
create index if not exists idx_ai_conversation_settings_conversation on public.ai_conversation_settings(conversation_id);

drop trigger if exists set_whatsapp_instances_updated_at on public.whatsapp_instances;
create trigger set_whatsapp_instances_updated_at before update on public.whatsapp_instances for each row execute function public.set_updated_at();
drop trigger if exists set_whatsapp_contacts_updated_at on public.whatsapp_contacts;
create trigger set_whatsapp_contacts_updated_at before update on public.whatsapp_contacts for each row execute function public.set_updated_at();
drop trigger if exists set_whatsapp_conversations_updated_at on public.whatsapp_conversations;
create trigger set_whatsapp_conversations_updated_at before update on public.whatsapp_conversations for each row execute function public.set_updated_at();
drop trigger if exists set_ai_agents_updated_at on public.ai_agents;
create trigger set_ai_agents_updated_at before update on public.ai_agents for each row execute function public.set_updated_at();
drop trigger if exists set_ai_conversation_settings_updated_at on public.ai_conversation_settings;
create trigger set_ai_conversation_settings_updated_at before update on public.ai_conversation_settings for each row execute function public.set_updated_at();

alter table public.whatsapp_instances enable row level security;
alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.ai_agents enable row level security;
alter table public.ai_conversation_settings enable row level security;

drop policy if exists "whatsapp instances staff all" on public.whatsapp_instances;
create policy "whatsapp instances staff all" on public.whatsapp_instances for all to authenticated
using (public.is_clinic_staff(clinic_id)) with check (public.is_clinic_staff(clinic_id));

drop policy if exists "whatsapp contacts staff all" on public.whatsapp_contacts;
create policy "whatsapp contacts staff all" on public.whatsapp_contacts for all to authenticated
using (public.is_clinic_staff(clinic_id)) with check (public.is_clinic_staff(clinic_id));

drop policy if exists "whatsapp conversations staff all" on public.whatsapp_conversations;
create policy "whatsapp conversations staff all" on public.whatsapp_conversations for all to authenticated
using (public.is_clinic_staff(clinic_id)) with check (public.is_clinic_staff(clinic_id));

drop policy if exists "whatsapp messages staff all" on public.whatsapp_messages;
create policy "whatsapp messages staff all" on public.whatsapp_messages for all to authenticated
using (public.is_clinic_staff(clinic_id)) with check (public.is_clinic_staff(clinic_id));

drop policy if exists "ai agents staff all" on public.ai_agents;
create policy "ai agents staff all" on public.ai_agents for all to authenticated
using (public.is_clinic_staff(clinic_id)) with check (public.is_clinic_staff(clinic_id));

drop policy if exists "ai conversation settings staff all" on public.ai_conversation_settings;
create policy "ai conversation settings staff all" on public.ai_conversation_settings for all to authenticated
using (public.is_clinic_staff(clinic_id)) with check (public.is_clinic_staff(clinic_id));

insert into public.ai_agents (clinic_id, name, provider, model, system_prompt, active)
select
  c.id,
  'Deby AI',
  'openai',
  'gpt-5.2',
  'Voce e Deby AI, assistente de atendimento da Analise Saude. Responda em portugues do Brasil, com tom humano, claro e objetivo. Nao diagnostique, nao prometa resultados e direcione assuntos clinicos para avaliacao profissional.',
  true
from public.clinicas c
on conflict (clinic_id, name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsapp-media',
  'whatsapp-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "whatsapp media staff read" on storage.objects;
create policy "whatsapp media staff read" on storage.objects for select to authenticated
using (
  bucket_id = 'whatsapp-media'
  and public.is_clinic_staff(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "whatsapp media staff insert" on storage.objects;
create policy "whatsapp media staff insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'whatsapp-media'
  and public.is_clinic_staff(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "whatsapp media staff update" on storage.objects;
create policy "whatsapp media staff update" on storage.objects for update to authenticated
using (
  bucket_id = 'whatsapp-media'
  and public.is_clinic_staff(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'whatsapp-media'
  and public.is_clinic_staff(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "whatsapp media staff delete" on storage.objects;
create policy "whatsapp media staff delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'whatsapp-media'
  and public.is_clinic_staff(((storage.foldername(name))[1])::uuid)
);
