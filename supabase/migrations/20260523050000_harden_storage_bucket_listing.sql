-- =============================================================================
-- HARDENING DE STORAGE: remove políticas de SELECT/listagem amplas nos buckets
-- públicos (prontuarios, whatsapp-media, clinic-photos).
-- =============================================================================
--
-- Motivo (Supabase advisor 0025 — public_bucket_allows_listing):
--   Buckets públicos com policy SELECT ampla em storage.objects permitem que
--   qualquer cliente LISTE todos os arquivos do bucket — inclusive arquivos de
--   prontuário (dados de saúde) e mídias de WhatsApp de OUTRAS clínicas.
--   Buckets públicos NÃO precisam de policy de SELECT para servir arquivos via
--   URL pública: o acesso por URL (getPublicUrl) continua funcionando normalmente.
--
-- Impacto no app: NENHUM.
--   - O frontend lê imagens/mídias via getPublicUrl (endpoint público, sem RLS).
--   - O frontend NÃO usa .list()/.download() autenticado nesses buckets.
--   - As permissões de escrita (INSERT/UPDATE/DELETE) são preservadas.
--
-- Observação: a confidencialidade total das mídias clínicas exige, num passo
-- seguinte, tornar os buckets PRIVADOS + usar URLs assinadas. Isso é uma mudança
-- maior (migra URLs já salvas no banco) e foi deixada fora desta migration para
-- não quebrar o estado atual.
-- =============================================================================

-- ── prontuarios ──────────────────────────────────────────────────────────────
-- "Prontuarios bucket access" era FOR ALL (cobria SELECT/INSERT/UPDATE/DELETE).
-- Removemos a policy ampla e a de SELECT. INSERT e DELETE já têm policies próprias;
-- recriamos apenas o UPDATE para preservar o comportamento de upsert no upload.
drop policy if exists "Prontuarios bucket access"                     on storage.objects;
drop policy if exists "Authenticated users can read prontuario files" on storage.objects;

drop policy if exists "Authenticated users can update prontuario files" on storage.objects;
create policy "Authenticated users can update prontuario files" on storage.objects
  for update to authenticated
  using (bucket_id = 'prontuarios')
  with check (bucket_id = 'prontuarios');

-- ── whatsapp-media ───────────────────────────────────────────────────────────
-- Remove as 3 policies de SELECT (incluindo a aberta para anon). As policies de
-- insert/update/delete escopadas por clínica (is_clinic_staff) permanecem.
drop policy if exists "whatsapp media staff read"    on storage.objects;
drop policy if exists "whatsapp_media_select"        on storage.objects;
drop policy if exists "whatsapp_media_public_select" on storage.objects;

-- ── clinic-photos ────────────────────────────────────────────────────────────
-- Remove a policy de SELECT pública (listagem). As de insert/update/delete
-- permanecem para o fluxo de upload de logos/fotos.
drop policy if exists "Clinic photos are publicly readable" on storage.objects;
