-- Migration for PWA Push Notifications
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  tipos text[] default '{}',
  criado_em timestamptz not null default now()
);

create index if not exists idx_push_subs_clinica on public.push_subscriptions(clinica_id);
create index if not exists idx_push_subs_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions owner all" on public.push_subscriptions;
create policy "push_subscriptions owner all" on public.push_subscriptions
  for all to authenticated
  using (public.is_clinic_member(clinica_id))
  with check (public.is_clinic_member(clinica_id));
