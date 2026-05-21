# Entrega - Evolucao ClinicPro com Deby AI

## Implementacao realizada

- Projeto criado em `clinicpro-deby-ai` a partir de `jonatasismael1/clinicpro`.
- `.env.local` local preparado a partir do arquivo pai, com aliases Vite para Supabase.
- Navegacao reorganizada por perfil:
  - Admin: todos os modulos.
  - Secretaria: dashboard, agenda, pacientes, leads, WhatsApp, Kanban de pacientes e caixa.
  - Profissional: dashboard, agenda, pacientes e Kanban de pacientes.
- Removida a tela generica `AI Growth Engine` da navegacao.
- Deby AI adicionada por contexto:
  - Financeiro admin: `Analisar caixa`.
  - Caixa admin: analise operacional.
  - WhatsApp: resumir conversa e sugerir resposta.
  - Leads: analisar lead e proximo passo.
- WAHA adicionado por backend:
  - `waha-status` consulta sessao.
  - `waha-send-message` envia mensagem e persiste historico.
  - `waha-webhook` recebe mensagens e grava contato/conversa/mensagem.
- Banco preparado com:
  - `kanban_etapas`, `leads`, `lead_movimentos`.
  - `whatsapp_contatos`, `whatsapp_conversas`, `whatsapp_mensagens`.
  - `fechamentos_caixa`, `ai_usage_logs`, `integration_events`.
  - RPCs `get_operational_cash`, `create_operational_payment`, `close_cash_register`, `seed_default_kanban_stages`.
  - RLS habilitado nas novas tabelas.

## Arquivos principais criados/modificados

- `supabase/migrations/20260520090000_deby_waha_leads_cash.sql`
- `supabase/functions/deby-ai/index.ts`
- `supabase/functions/waha-status/index.ts`
- `supabase/functions/waha-send-message/index.ts`
- `supabase/functions/waha-webhook/index.ts`
- `src/pages/admin/modules/CashPanel.tsx`
- `src/pages/admin/modules/LeadKanbanPanel.tsx`
- `src/pages/admin/modules/WhatsAppPanel.tsx`
- `src/services/debyService.ts`
- `src/services/cashService.ts`
- `src/services/leadService.ts`
- `src/services/wahaService.ts`
- `src/pages/admin/AdminPage.tsx`
- `src/components/layout/AdminShell.tsx`
- `src/pages/admin/modules/FinancePanel.tsx`
- `eslint.config.js`
- `.env.example`

## Como rodar localmente

```bash
cd clinicpro-deby-ai
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Configuracao de ambiente

Frontend:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_MODE=production
VITE_ALLOW_PUBLIC_SIGNUP=false
```

Edge Functions / backend:

```bash
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DEFAULT_AI_MODEL=
WAHA_BASE_URL=
WAHA_API_KEY=
WAHA_SESSION=default
WAHA_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:5173
```

## Supabase

Aplicar a migration:

```bash
supabase db push
```

Ou executar o SQL de `supabase/migrations/20260520090000_deby_waha_leads_cash.sql` no SQL Editor do projeto.

Publicar Edge Functions:

```bash
supabase functions deploy deby-ai
supabase functions deploy waha-status
supabase functions deploy waha-send-message
supabase functions deploy waha-webhook
```

Configurar secrets:

```bash
supabase secrets set --env-file .env.local
```

## WAHA

- Configure `WAHA_BASE_URL`, `WAHA_API_KEY` e `WAHA_SESSION`.
- O status usa `GET /api/sessions/{session}`.
- O envio usa `POST /api/sendText`.
- Configure o webhook WAHA para:

```text
https://<project-ref>.supabase.co/functions/v1/waha-webhook?clinicId=<CLINICA_ID>
```

- Envie o segredo em `x-webhook-secret` com o valor de `WAHA_WEBHOOK_SECRET`.

## Validacao executada

```bash
npm install
npm run lint
npm run build
```

Resultados:

- `npm run lint`: sem erros, 4 avisos herdados.
- `npm run build`: sucesso.
- Aviso restante: bundle principal acima de 500 kB.
- `npm audit`: 4 vulnerabilidades reportadas por dependencias existentes.

## Pendencias

- Aplicar migration no Supabase remoto. Nesta maquina nao ha `psql`, `pg_dump` ou `supabase` global, e a tentativa via `npx` travou ate timeout.
- Publicar Edge Functions e configurar secrets no projeto Supabase.
- Testar com usuarios reais admin/secretaria/profissional.
- Testar WAHA contra uma sessao ativa.
- Avaliar code splitting para reduzir bundle.
