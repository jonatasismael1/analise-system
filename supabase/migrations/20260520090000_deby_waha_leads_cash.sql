create extension if not exists pgcrypto;

alter table public.pagamentos add column if not exists descricao text;
alter table public.pagamentos add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.despesas add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.pacientes add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.agendamentos add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.kanban_etapas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nome text not null,
  chave text not null,
  ordem int not null default 0,
  cor text not null default 'slate',
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinica_id, chave)
);

create table if not exists public.whatsapp_contatos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nome text,
  telefone text not null,
  chat_id text not null,
  paciente_id uuid references public.pacientes(id) on delete set null,
  lead_id uuid,
  origem text not null default 'waha',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinica_id, chat_id)
);

create table if not exists public.whatsapp_conversas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  contato_id uuid not null references public.whatsapp_contatos(id) on delete cascade,
  chat_id text not null,
  ultimo_texto text,
  ultima_mensagem_em timestamptz,
  status text not null default 'aberta' check (status in ('aberta','aguardando','resolvida','arquivada')),
  lead_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinica_id, chat_id)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  origem text not null default 'manual',
  interesse text,
  etapa_id uuid references public.kanban_etapas(id) on delete set null,
  paciente_id uuid references public.pacientes(id) on delete set null,
  conversa_id uuid references public.whatsapp_conversas(id) on delete set null,
  temperatura text not null default 'morno' check (temperatura in ('frio','morno','quente')),
  objecoes text,
  proximo_passo text,
  resumo text,
  responsavel_id uuid references public.usuarios(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_contatos
  drop constraint if exists whatsapp_contatos_lead_id_fkey;
alter table public.whatsapp_contatos
  add constraint whatsapp_contatos_lead_id_fkey foreign key (lead_id) references public.leads(id) on delete set null;

alter table public.whatsapp_conversas
  drop constraint if exists whatsapp_conversas_lead_id_fkey;
alter table public.whatsapp_conversas
  add constraint whatsapp_conversas_lead_id_fkey foreign key (lead_id) references public.leads(id) on delete set null;

create table if not exists public.whatsapp_mensagens (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  conversa_id uuid not null references public.whatsapp_conversas(id) on delete cascade,
  contato_id uuid not null references public.whatsapp_contatos(id) on delete cascade,
  waha_message_id text,
  direcao text not null check (direcao in ('in','out')),
  texto text,
  payload jsonb not null default '{}'::jsonb,
  enviada_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.lead_movimentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  etapa_origem_id uuid references public.kanban_etapas(id) on delete set null,
  etapa_destino_id uuid references public.kanban_etapas(id) on delete set null,
  observacao text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.fechamentos_caixa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  data date not null default current_date,
  total_recebido numeric(12,2) not null default 0,
  total_pendente numeric(12,2) not null default 0,
  observacoes text,
  fechado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinica_id, data)
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  module text not null,
  role text,
  input_chars int not null default 0,
  output_chars int not null default 0,
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinicas(id) on delete cascade,
  integration text not null,
  event_type text not null,
  status text not null default 'ok',
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_kanban_etapas_clinica_ordem on public.kanban_etapas(clinica_id, ordem);
create index if not exists idx_leads_clinica_etapa on public.leads(clinica_id, etapa_id);
create index if not exists idx_leads_conversa on public.leads(conversa_id);
create index if not exists idx_whatsapp_contatos_clinica_chat on public.whatsapp_contatos(clinica_id, chat_id);
create index if not exists idx_whatsapp_conversas_clinica_status on public.whatsapp_conversas(clinica_id, status);
create index if not exists idx_whatsapp_mensagens_conversa on public.whatsapp_mensagens(conversa_id, enviada_em);
create index if not exists idx_fechamentos_caixa_clinica_data on public.fechamentos_caixa(clinica_id, data);

drop trigger if exists set_kanban_etapas_updated_at on public.kanban_etapas;
create trigger set_kanban_etapas_updated_at before update on public.kanban_etapas for each row execute function public.set_updated_at();
drop trigger if exists set_whatsapp_contatos_updated_at on public.whatsapp_contatos;
create trigger set_whatsapp_contatos_updated_at before update on public.whatsapp_contatos for each row execute function public.set_updated_at();
drop trigger if exists set_whatsapp_conversas_updated_at on public.whatsapp_conversas;
create trigger set_whatsapp_conversas_updated_at before update on public.whatsapp_conversas for each row execute function public.set_updated_at();
drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
drop trigger if exists set_fechamentos_caixa_updated_at on public.fechamentos_caixa;
create trigger set_fechamentos_caixa_updated_at before update on public.fechamentos_caixa for each row execute function public.set_updated_at();

alter table public.kanban_etapas enable row level security;
alter table public.leads enable row level security;
alter table public.lead_movimentos enable row level security;
alter table public.whatsapp_contatos enable row level security;
alter table public.whatsapp_conversas enable row level security;
alter table public.whatsapp_mensagens enable row level security;
alter table public.fechamentos_caixa enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.integration_events enable row level security;

drop policy if exists "kanban etapas staff all" on public.kanban_etapas;
create policy "kanban etapas staff all" on public.kanban_etapas for all to authenticated
using (public.is_clinic_staff(clinica_id)) with check (public.is_clinic_staff(clinica_id));

drop policy if exists "leads staff all" on public.leads;
create policy "leads staff all" on public.leads for all to authenticated
using (public.is_clinic_staff(clinica_id)) with check (public.is_clinic_staff(clinica_id));

drop policy if exists "lead movimentos staff all" on public.lead_movimentos;
create policy "lead movimentos staff all" on public.lead_movimentos for all to authenticated
using (public.is_clinic_staff(clinica_id)) with check (public.is_clinic_staff(clinica_id));

drop policy if exists "whatsapp contatos staff all" on public.whatsapp_contatos;
create policy "whatsapp contatos staff all" on public.whatsapp_contatos for all to authenticated
using (public.is_clinic_staff(clinica_id)) with check (public.is_clinic_staff(clinica_id));

drop policy if exists "whatsapp conversas staff all" on public.whatsapp_conversas;
create policy "whatsapp conversas staff all" on public.whatsapp_conversas for all to authenticated
using (public.is_clinic_staff(clinica_id)) with check (public.is_clinic_staff(clinica_id));

drop policy if exists "whatsapp mensagens staff all" on public.whatsapp_mensagens;
create policy "whatsapp mensagens staff all" on public.whatsapp_mensagens for all to authenticated
using (public.is_clinic_staff(clinica_id)) with check (public.is_clinic_staff(clinica_id));

drop policy if exists "fechamentos caixa staff all" on public.fechamentos_caixa;
create policy "fechamentos caixa staff all" on public.fechamentos_caixa for all to authenticated
using (public.is_clinic_staff(clinica_id)) with check (public.is_clinic_staff(clinica_id));

drop policy if exists "ai usage admin read" on public.ai_usage_logs;
create policy "ai usage admin read" on public.ai_usage_logs for select to authenticated
using (public.is_clinic_admin(clinica_id));

drop policy if exists "integration events admin read" on public.integration_events;
create policy "integration events admin read" on public.integration_events for select to authenticated
using (public.is_clinic_admin(clinica_id));

insert into public.kanban_etapas (clinica_id, nome, chave, ordem, cor)
select c.id, v.nome, v.chave, v.ordem, v.cor
from public.clinicas c
cross join (values
  ('Novo lead', 'novo_lead', 10, 'sky'),
  ('Em atendimento', 'em_atendimento', 20, 'indigo'),
  ('Agendado', 'agendado', 30, 'violet'),
  ('Compareceu', 'compareceu', 40, 'emerald'),
  ('Fechado', 'fechado', 50, 'teal'),
  ('Perdido', 'perdido', 60, 'rose')
) as v(nome, chave, ordem, cor)
on conflict (clinica_id, chave) do nothing;

create or replace function public.seed_default_kanban_stages(target_clinica_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.kanban_etapas (clinica_id, nome, chave, ordem, cor)
  select target_clinica_id, v.nome, v.chave, v.ordem, v.cor
  from (values
    ('Novo lead', 'novo_lead', 10, 'sky'),
    ('Em atendimento', 'em_atendimento', 20, 'indigo'),
    ('Agendado', 'agendado', 30, 'violet'),
    ('Compareceu', 'compareceu', 40, 'emerald'),
    ('Fechado', 'fechado', 50, 'teal'),
    ('Perdido', 'perdido', 60, 'rose')
  ) as v(nome, chave, ordem, cor)
  where public.is_clinic_staff(target_clinica_id)
  on conflict (clinica_id, chave) do nothing;
$$;

create or replace function public.get_operational_cash(target_clinica_id uuid, start_date date, end_date date)
returns table (
  id uuid,
  descricao text,
  valor numeric,
  status text,
  data date,
  forma_pagamento text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         coalesce(p.descricao, 'Pagamento') as descricao,
         p.valor,
         p.status,
         coalesce(p.data_pagamento, p.data_vencimento, p.created_at::date) as data,
         p.forma_pagamento
  from public.pagamentos p
  where p.clinica_id = target_clinica_id
    and public.is_clinic_staff(target_clinica_id)
    and coalesce(p.data_pagamento, p.data_vencimento, p.created_at::date) between start_date and end_date
    and p.status <> 'cancelado'
  order by data desc, p.created_at desc;
$$;

create or replace function public.create_operational_payment(
  target_clinica_id uuid,
  payment_description text,
  payment_value numeric,
  payment_method text,
  payment_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id uuid;
begin
  if not public.is_clinic_staff(target_clinica_id) then
    raise exception 'Acesso negado';
  end if;

  insert into public.pagamentos (
    clinica_id, descricao, valor, status, forma_pagamento, data_pagamento, created_by
  ) values (
    target_clinica_id, payment_description, payment_value, 'pago', payment_method, payment_date, auth.uid()
  )
  returning id into created_id;

  return created_id;
end;
$$;

create or replace function public.close_cash_register(
  target_clinica_id uuid,
  cash_date date,
  notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  received numeric;
  pending numeric;
  closing_id uuid;
begin
  if not public.is_clinic_staff(target_clinica_id) then
    raise exception 'Acesso negado';
  end if;

  select coalesce(sum(valor) filter (where status = 'pago'), 0),
         coalesce(sum(valor) filter (where status in ('pendente','atrasado')), 0)
    into received, pending
  from public.pagamentos
  where clinica_id = target_clinica_id
    and coalesce(data_pagamento, data_vencimento, created_at::date) = cash_date;

  insert into public.fechamentos_caixa (clinica_id, data, total_recebido, total_pendente, observacoes, fechado_por)
  values (target_clinica_id, cash_date, received, pending, notes, auth.uid())
  on conflict (clinica_id, data)
  do update set total_recebido = excluded.total_recebido,
                total_pendente = excluded.total_pendente,
                observacoes = excluded.observacoes,
                fechado_por = excluded.fechado_por,
                updated_at = now()
  returning id into closing_id;

  return closing_id;
end;
$$;

revoke execute on function public.seed_default_kanban_stages(uuid) from anon;
revoke execute on function public.get_operational_cash(uuid,date,date) from anon;
revoke execute on function public.create_operational_payment(uuid,text,numeric,text,date) from anon;
revoke execute on function public.close_cash_register(uuid,date,text) from anon;
grant execute on function public.seed_default_kanban_stages(uuid) to authenticated;
grant execute on function public.get_operational_cash(uuid,date,date) to authenticated;
grant execute on function public.create_operational_payment(uuid,text,numeric,text,date) to authenticated;
grant execute on function public.close_cash_register(uuid,date,text) to authenticated;
