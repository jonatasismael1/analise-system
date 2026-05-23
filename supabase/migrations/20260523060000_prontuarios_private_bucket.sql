-- =============================================================================
-- PRIVACIDADE DO BUCKET prontuarios: torna privado + leitura via URL assinada
-- =============================================================================
--
-- Motivo (LGPD): imagens de prontuário (dados de saúde) estavam num bucket
-- PÚBLICO — acessíveis por qualquer pessoa que tivesse ou adivinhasse a URL,
-- mesmo sem login. Como essas imagens só são visualizadas DENTRO do app por
-- equipe autenticada (não há fetch externo, ao contrário do whatsapp-media, que
-- precisa ser público para o WhatsApp baixar a mídia enviada), podemos torná-lo
-- privado e servir as imagens via URLs assinadas (createSignedUrl).
--
-- Compatibilidade (NÃO quebra o estado atual):
--   As URLs públicas já salvas em prontuarios.imagens continuam funcionando — o
--   frontend agora extrai o caminho do objeto e gera uma URL assinada sob demanda.
--   Ver src/lib/storageUrls.ts e src/components/ui/SignedImage.tsx.
--
-- Observação sobre escopo por clínica:
--   O caminho dos objetos hoje é "prontuarios/<id|novo>/<arquivo>", ou seja, NÃO
--   começa pelo clinica_id — por isso não é possível escopar o SELECT por clínica
--   via storage.foldername sem antes migrar os caminhos. O ganho principal aqui é
--   eliminar o acesso ANÔNIMO/público. Restringir leitura entre clínicas (somente
--   equipe da própria clínica) exige um passo posterior de refatoração de caminhos.
-- =============================================================================

-- 1. Torna o bucket privado (remove o acesso anônimo via URL pública/CDN)
update storage.buckets set public = false where id = 'prontuarios';

-- 2. createSignedUrl exige permissão de SELECT em storage.objects para o usuário.
--    Restringe a leitura a usuários AUTENTICADOS (sem acesso anônimo).
drop policy if exists "prontuarios authenticated signed read" on storage.objects;
create policy "prontuarios authenticated signed read" on storage.objects
  for select to authenticated
  using (bucket_id = 'prontuarios');
