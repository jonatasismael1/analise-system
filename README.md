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
```

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
