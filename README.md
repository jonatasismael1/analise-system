# Análise Saúde System

Sistema SaaS para clínicas acompanharem agenda, pacientes, financeiro, pacotes, acessos e oportunidades de crescimento em um único painel.

## Visão geral

Análise Saúde System é uma aplicação React com Supabase voltada para a operação diária da clínica Análise Saúde. O painel administrativo concentra agenda, profissionais, serviços, pacientes, Kanban, financeiro, caixa, WhatsApp, leads, acessos e apoio operacional com Deby AI.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth, Database, RPC e Edge Functions
- Lucide React

## Funcionalidades

- Login protegido por Supabase Auth
- Cadastro e gestão de profissionais, serviços e pacientes
- Agendamentos internos e página pública de agendamento
- Calendário semanal operacional com filtros
- Kanban de pacientes por etapa
- Controle financeiro de pagamentos e despesas
- Pacotes de sessões
- Relatórios e exportação financeira
- Gestão de acessos por perfil
- Modo demonstração controlado por variável de ambiente

## Estrutura de pastas

- `src/pages`: páginas roteadas da aplicação
- `src/pages/admin`: AdminPage modularizada em painéis e componentes
- `src/components`: componentes compartilhados
- `src/hooks`: hooks de dados e integrações
- `src/lib`: clientes, helpers e configurações
- `src/types`: tipos de domínio e tipos Supabase
- `src/data`: dados de demonstração
- `supabase/migrations`: schema e políticas SQL
- `supabase/functions`: Edge Functions

## Variáveis de ambiente

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_MODE=production
VITE_ALLOW_PUBLIC_SIGNUP=false
SUPABASE_URL=

EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_DEFAULT_INSTANCE=
EVOLUTION_WEBHOOK_SECRET=
EVOLUTION_WEBHOOK_URL=

OPENAI_API_KEY=
DEFAULT_AI_MODEL=gpt-5.2
```

`EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_SECRET` e `OPENAI_API_KEY` devem ser configuradas somente nas Edge Functions/Supabase Secrets. Não use prefixo `VITE_` para essas variáveis, porque qualquer variável `VITE_` fica disponível no navegador.

## Como rodar localmente

```bash
npm install
npm run dev
```

Para validar produção:

```bash
npm run build
npm run preview
```

## Modo demo vs produção

- `VITE_APP_MODE=demo`: permite renderizar `mockData` e mostra badge de modo demonstração.
- `VITE_APP_MODE=production`: nunca usa dados fictícios como fallback. Se Supabase falhar, a interface mostra erro e botão para tentar novamente.

## Integração Supabase

A aplicação usa a anon key no frontend e mantém operações privilegiadas em Edge Functions. As tabelas públicas usam RLS e políticas por clínica. Não exponha `service_role` no cliente.

## WhatsApp com Evolution API v2

O módulo WhatsApp usa Edge Functions como camada interna entre o frontend e a Evolution API. O navegador nunca chama a Evolution diretamente.

- `supabase/functions/_shared/evolution.ts`: helper centralizado da Evolution API.
- `supabase/functions/evolution-instance`: lista, cria, conecta, verifica status, desconecta e deleta instâncias.
- `supabase/functions/evolution-send-message`: envia texto e mídia pela Evolution.
- `supabase/functions/evolution-webhook`: webhook público para eventos da Evolution.

Configure a Evolution para chamar:

```text
<SUPABASE_URL>/functions/v1/evolution-webhook?clinicId=<CLINIC_ID>
```

Em deploys na Netlify, o projeto também inclui `netlify/functions/evolution-webhook.mjs`, que expõe `/api/webhooks/evolution?clinicId=<CLINIC_ID>` e repassa o payload para a Edge Function. Para esse proxy, configure `SUPABASE_URL` na Netlify.

Use o header `authorization` com o valor de `EVOLUTION_WEBHOOK_SECRET`.

Eventos esperados da Evolution:

- `QRCODE_UPDATED`
- `CONNECTION_UPDATE`
- `MESSAGES_UPSERT`
- `MESSAGES_UPDATE`
- `SEND_MESSAGE`
- `CONTACTS_UPSERT`
- `CONTACTS_UPDATE`
- `CHATS_UPSERT`
- `CHATS_UPDATE`

## Migrations do WhatsApp

A migration `supabase/migrations/20260520120000_evolution_whatsapp_module.sql` cria:

- `whatsapp_instances`
- `whatsapp_contacts`
- `whatsapp_conversations`
- `whatsapp_messages`
- `ai_agents`
- `ai_conversation_settings`
- bucket público `whatsapp-media` com políticas por clínica

Ela também cria o agente padrão `Deby AI` para as clínicas existentes, índices, triggers de `updated_at` e políticas RLS usando `is_clinic_staff`.

## Como testar a Evolution

1. Configure os secrets `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_DEFAULT_INSTANCE`, `EVOLUTION_WEBHOOK_SECRET`, `EVOLUTION_WEBHOOK_URL` e `OPENAI_API_KEY`.
2. Rode as migrations do Supabase.
3. Abra o painel `WhatsApp` e crie a instância `analise-saude`.
4. Clique em `QR Code` e escaneie no WhatsApp.
5. Clique em `Status` até aparecer `Conectado`.
6. Envie uma mensagem de um número externo para o WhatsApp conectado; o webhook deve criar contato, conversa, mensagem e lead com origem `whatsapp`.
7. Responda pelo inbox com texto.
8. Anexe uma imagem, vídeo, áudio ou PDF e envie.
9. Na lateral `Deby AI`, ative a IA da conversa.
10. Teste `Assistido` para salvar sugestão e `Automático` para envio direto quando chegar nova mensagem.
11. Abra o Kanban de Leads e confirme que o lead automático apareceu na primeira etapa.

## Roadmap

- Code splitting para reduzir bundle inicial
- Testes automatizados dos fluxos críticos
- Melhorias de auditoria e logs de ações sensíveis
- Mais filtros nos relatórios
- Melhorias de acessibilidade no painel administrativo

## Cuidados de segurança

- Nunca commitar `.env.local` ou chaves reais
- Rotacionar tokens expostos acidentalmente
- Manter `VITE_ALLOW_PUBLIC_SIGNUP=false` em produção comercial controlada
- Validar RLS após qualquer alteração de schema
- Confirmar ações destrutivas antes de excluir dados
