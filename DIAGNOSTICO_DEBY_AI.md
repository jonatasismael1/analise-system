# Diagnostico tecnico inicial - ClinicPro Deby AI

## Estado encontrado

- Aplicacao Vite + React + TypeScript com Supabase como backend.
- Autenticacao via Supabase Auth em `AuthContext`, usando `get_my_clinic_context`.
- Dados administrativos centralizados em `useClinicData`.
- Modulos existentes: dashboard, profissionais, servicos, agendamentos, pacientes, Kanban de pacientes, financeiro, pacotes, relatorios e acessos.
- Supabase ja tinha migrations para clinicas, profissionais, servicos, pacientes, agendamentos, pacotes, pagamentos, despesas, usuarios, prontuarios, notificacoes e RLS basico.
- Perfis existentes: `admin`, `profissional`, `secretaria`.

## Limites encontrados

- O financeiro era restrito ao admin e nao havia caixa operacional para secretaria.
- O Kanban existente era de pacientes, nao de leads comerciais.
- Nao havia estrutura persistente para WhatsApp, contatos, conversas ou mensagens.
- Nao havia backend seguro para IA; qualquer integracao direta no frontend exporia secrets.
- O modulo `AI Growth Engine` era generico demais para o objetivo da Deby AI.
- O schema tinha RLS, mas faltavam tabelas e RPCs para permissoes operacionais mais finas.
- O projeto nao possuia script de lint.

## Reaproveitado

- Layout administrativo, autenticacao, servicos Supabase e padrao visual existente.
- RLS helper `is_clinic_admin` / `is_clinic_staff`.
- Estrutura de Edge Function existente em `create-staff-user`.
- Financeiro e Kanban existentes como base para os novos fluxos.

## Refatorado / adicionado

- Novo modulo de Caixa operacional para secretaria/admin.
- Novo modulo de Leads com Kanban comercial configuravel.
- Novo modulo WhatsApp integrado a WAHA via Edge Functions.
- Deby AI integrada em financeiro, caixa, WhatsApp e leads por acoes contextuais.
- Migration `20260520090000_deby_waha_leads_cash.sql` com tabelas, RLS e RPCs.
- Edge Functions: `deby-ai`, `waha-status`, `waha-send-message`, `waha-webhook`.
- Lint com ESLint flat config.

## Riscos tecnicos

- A migration remota nao foi aplicada nesta execucao porque `psql`, `pg_dump` e `supabase` nao estao instalados globalmente, e a tentativa de conexao temporaria via `npx` travou ate timeout.
- As Edge Functions precisam ser publicadas no Supabase e receber secrets antes dos fluxos WAHA/Deby funcionarem em producao.
- O bundle principal segue acima de 500 kB; nao bloqueia, mas recomenda code splitting futuro.
- O lint passa com avisos herdados em `AuthContext` e `Field`.
- Testes automatizados de permissao por usuarios reais dependem de credenciais/perfis existentes no Supabase remoto.

