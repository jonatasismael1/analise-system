# Clinic Pro — Agents & Skills

> Atualizado em 2026-05-21. Reflete o estado atual do projeto em produção.

---

## Estado atual do projeto

O ClinicPro (Análise Saúde) é um SaaS clínico completo em produção com:
- React 18 + TypeScript + Vite + Tailwind CSS
- Supabase (Auth, PostgreSQL + RLS, Edge Functions, Realtime, Storage)
- Evolution API v2 (WhatsApp via Baileys)
- Deby AI (assistente de respostas)
- Deploy: Netlify (frontend) + Supabase Cloud (backend)
- Repositório: https://github.com/jonatasismael1/analise-system

---

## Módulos em produção

| Módulo | Status |
|---|---|
| Dashboard + Growth Engine IA | ✅ Produção |
| Profissionais | ✅ Produção |
| Serviços | ✅ Produção |
| Agendamentos | ✅ Produção |
| Pacientes + Prontuário | ✅ Produção |
| Receita digital (médico) | ✅ Produção |
| Leads (Kanban) | ✅ Produção |
| WhatsApp (inbox + contatos + IA) | ✅ Produção |
| Caixa | ✅ Produção |
| Financeiro | ✅ Produção |
| Pacotes & Sessões | ✅ Produção |
| Relatórios | ✅ Produção |
| Acessos | ✅ Produção |

---

## Agentes por fase

### Fase 1 — Setup inicial (concluída)
- **Explorer agent**: Revisar `IMPLEMENTATION.md`, confirmar estrutura e escopo do Supabase client/env.
- **Main agent**: Implementar base React, cliente Supabase, rotas mínimas e validação de build.

### Fase 2 — Backend & Auth (concluída)
- **Schema agent**: Revisar SQL, RLS e políticas em todas as tabelas antes de expor dados reais.
- **Auth agent**: Revisar fluxo Supabase Auth, proteção de `/admin` e RLS por `clinica_id`.

### Fase 3 — Módulos CRUD (concluída)
- **Module agents**: Um módulo por vez — profissionais, serviços, agendamentos, pacientes, financeiro, pacotes, relatórios, acessos.
- Regra: manter design aprovado, não refatorar o app todo.

### Fase 4 — WhatsApp + IA (concluída)
- **WhatsApp agent**: Edge Functions `quick-action` e `evolution-webhook`, schema de tabelas, sync de contatos, inbox realtime.
- **AI agent**: Integração Deby AI para sugestão de resposta e resumo de conversa.

---

## Regras para novos agentes

1. **Nunca** alterar o design system aprovado (tokens, fontes, paleta).
2. **Nunca** chamar a Evolution API diretamente do frontend — sempre via Edge Function `quick-action`.
3. **Nunca** usar `service_role` no frontend — apenas no backend (Edge Functions).
4. Todo acesso ao banco deve respeitar o `clinica_id` do usuário logado (RLS).
5. Ao modificar `WhatsAppPanel.tsx`, preservar a estrutura de 3 colunas e o estado do drawer mobile.
6. Ao fazer deploy de Edge Function, usar `verify_jwt: false` apenas para `quick-action` e `evolution-webhook` (autenticação é feita pelo `clinicId` no body/query).
7. Após qualquer mudança, fazer push para `analise` remote (não `origin`): `git push analise main`.

---

## Skill: Novo módulo ou feature

Quando o usuário pedir uma nova feature, siga:

1. **Verificar** se afeta banco → criar migration com `mcp__supabase__apply_migration`.
2. **Verificar** se afeta Edge Function → atualizar e fazer deploy com `mcp__supabase__deploy_edge_function`.
3. **Implementar** frontend no serviço adequado (`src/services/`) e depois no painel (`src/pages/admin/modules/`).
4. **Testar** build local se possível.
5. **Commit** com mensagem descritiva e `git push analise main`.

---

## Skill: Debug de mensagens WhatsApp

Se mensagens não aparecem:
1. Verificar se o webhook está configurado na instância (`setInstanceWebhook`).
2. Verificar logs da Edge Function `evolution-webhook` no Supabase.
3. Verificar se `waha_message_id` está causando deduplicação indevida.
4. Verificar se o evento está sendo detectado corretamente (`eventKey`).

Se contatos não sincronizam:
1. Desconectar e reconectar a instância WhatsApp — dispara `CONTACTS_UPSERT` com todos os contatos.
2. Verificar logs da função `handleContactsUpsert`.
