\# IMPLEMENTATION.md

\# Clinic Pro — Implementação Backend com Supabase

\#\# Objetivo

Transformar o frontend atual do Clinic Pro em um SaaS funcional usando Supabase, mantendo o design já aprovado.

O Clinic Pro é uma agenda multi-profissional com IA para clínicas e consultórios, com foco em:

\*   Agendamento online  
\*   Gestão de profissionais  
\*   Gestão de pacientes  
\*   Serviços  
\*   Pacotes e sessões  
\*   Financeiro  
\*   Relatórios  
\*   AI Growth Engine para identificar perda de receita

\---

\#\# Stack

\*   React  
\*   Tailwind CSS  
\*   Supabase  
\*   Supabase Auth  
\*   Supabase Postgres  
\*   Supabase Row Level Security  
\*   @supabase/supabase-js

\---

\#\# Regras obrigatórias

\*   Não alterar o design visual aprovado.  
\*   Não refatorar o app inteiro.  
\*   Não apagar componentes existentes.  
\*   Não mudar rotas sem necessidade.  
\*   Não usar \`service\_role\` no frontend.  
\*   Usar apenas \`VITE\_SUPABASE\_URL\` e \`VITE\_SUPABASE\_ANON\_KEY\`.  
\*   Preservar responsividade.  
\*   Substituir mocks por dados reais progressivamente.  
\*   Criar fallback visual quando não houver dados.  
\*   Validar build após cada fase.

\---

\#\# Variáveis de ambiente

Criar arquivo \`.env.local\`:

\`\`\`env  
VITE\_SUPABASE\_URL=https://znjigyvldtktzmqnamlo.supabase.co  
VITE\_SUPABASE\_ANON\_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuamlneXZsZHRrdHptcW5hbWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5OTY5OTksImV4cCI6MjA5MjU3Mjk5OX0.wviO94Kn\_C5NcCBpJqFPwt1qAswJ850MNmWzVukPs4M

use o supabase local com:  
$env:SUPABASE\_ACCESS\_TOKEN="sbp\_461776a43af6205807405fb4c7275f5eb55313d9"

Nunca colocar no frontend:  
SUPABASE\_SERVICE\_ROLE\_KEY  
\-----Fase 1 — Conectar SupabasePrompt para Codex

Analise este projeto React \+ Tailwind do SaaS Clinic Pro.

Objetivo:

Implementar a conexão com Supabase, sem alterar o design visual já aprovado.

Tarefas:

1. Instalar @supabase/supabase-js se ainda não existir.  
2. Criar o arquivo de cliente Supabase em src/lib/supabaseClient.ts ou equivalente.  
3. Usar variáveis de ambiente:  
   * `VITE_SUPABASE_URL`  
   * `VITE_SUPABASE_ANON_KEY`  
4. Não usar `service_role` no frontend.  
5. Mapear todos os pontos do app que hoje usam dados mockados.  
6. Manter fallback visual caso a tabela ainda esteja vazia.  
7. Não quebrar rotas, layout, componentes, sidebar, cards ou responsividade.

Entregue:

* Arquivos criados/alterados  
* Lista dos componentes que ainda dependem de mock  
* Instruções de variáveis .env

Critério de aceite:

* Projeto compila.  
* Supabase client criado.  
* Nenhum design alterado.  
* Nenhuma chave sensível exposta.

\-----Fase 2 — Schema SQL SupabasePrompt para Codex

Crie o schema SQL completo para Supabase/Postgres do SaaS Clinic Pro.

Entidades necessárias:

`clinicas`:

* `id` uuid primary key  
* `nome` text  
* `slug` text unique  
* `email` text unique  
* `user_id` uuid references auth.users(id)  
* `created_at` timestamptz  
* `updated_at` timestamptz

`profissionais`:

* `id` uuid primary key  
* `clinica_id` uuid references clinicas(id)  
* `nome` text  
* `especialidade` text  
* `foto_url` text  
* `horarios` jsonb  
* `ativo` boolean  
* `created_at` timestamptz  
* `updated_at` timestamptz

`servicos`:

* `id` uuid primary key  
* `clinica_id` uuid references clinicas(id)  
* `profissional_id` uuid references profissionais(id)  
* `nome` text  
* `duracao_min` int  
* `preco` numeric  
* `ativo` boolean  
* `created_at` timestamptz  
* `updated_at` timestamptz

`pacientes`:

* `id` uuid primary key  
* `clinica_id` uuid references clinicas(id)  
* `nome` text  
* `whatsapp` text  
* `email` text  
* `status` text  
* `profissional_id` uuid references profissionais(id)  
* `ultimo_atendimento` date  
* `proximo_retorno` date  
* `valor_total_gasto` numeric  
* `observacoes` text  
* `created_at` timestamptz  
* `updated_at` timestamptz

`agendamentos`:

* `id` uuid primary key  
* `clinica_id` uuid references clinicas(id)  
* `profissional_id` uuid references profissionais(id)  
* `servico_id` uuid references servicos(id)  
* `paciente_id` uuid references pacientes(id)  
* `paciente_nome` text  
* `paciente_whatsapp` text  
* `data` date  
* `horario` time  
* `status` text  
* `created_at` timestamptz  
* `updated_at` timestamptz

`pacotes_sessoes`:

* `id` uuid primary key  
* `clinica_id` uuid references clinicas(id)  
* `paciente_id` uuid references pacientes(id)  
* `servico_id` uuid references servicos(id)  
* `total_sessoes` int  
* `sessoes_realizadas` int  
* `validade` date  
* `status` text  
* `created_at` timestamptz  
* `updated_at` timestamptz

`pagamentos`:

* `id` uuid primary key  
* `clinica_id` uuid references clinicas(id)  
* `paciente_id` uuid references pacientes(id)  
* `servico_id` uuid references servicos(id)  
* `profissional_id` uuid references profissionais(id)  
* `valor` numeric  
* `data_vencimento` date  
* `data_pagamento` date  
* `status` text  
* `forma_pagamento` text  
* `created_at` timestamptz  
* `updated_at` timestamptz

`despesas`:

* `id` uuid primary key  
* `clinica_id` uuid references clinicas(id)  
* `descricao` text  
* `categoria` text  
* `valor` numeric  
* `data` date  
* `status` text  
* `created_at` timestamptz  
* `updated_at` timestamptz

Obrigatório:

* Usar `gen_random_uuid()`  
* Criar indexes úteis  
* Criar constraints básicas de status  
* Criar trigger para `updated_at`  
* Ativar Row Level Security em todas as tabelas  
* Criar políticas para que cada clínica veja apenas seus próprios dados  
* Permitir leitura pública apenas de dados mínimos da rota `/agendar/[slug]`:  
  * clinica por slug  
  * profissionais ativos  
  * serviços ativos  
* Não permitir que financeiro seja público  
* Criar proteção contra agendamento duplicado:  
  * `profissional_id` \+ `data` \+ `horario`

Entregue:

* SQL completo pronto para colar no SQL Editor do Supabase  
* Explicação curta de como rodar

Critério de aceite:

* SQL roda sem erro.  
* Tabelas criadas.  
* RLS ativo.  
* Dados privados protegidos.  
* Página pública consegue ler apenas o necessário.

\-----Fase 3 — Auth da ClínicaPrompt para Codex

Implemente autenticação real no Clinic Pro usando Supabase Auth.

Objetivo:

A clínica deve conseguir fazer login e acessar o painel `/admin`.

Tarefas:

1. Criar tela `/login`.  
2. Criar fluxo de login com email e senha.  
3. Criar proteção da rota `/admin`.  
4. Se o usuário não estiver logado, redirecionar para `/login`.  
5. Criar botão de sair.  
6. Buscar a clínica vinculada ao `auth.user.id`.  
7. Salvar contexto da clínica logada para filtrar dados por `clinica_id`.  
8. Não alterar o design geral do app.

Importante:

* Não criar cadastro público agora.  
* O cadastro da clínica pode ser feito manualmente no Supabase.  
* Usar Supabase Auth.  
* Manter UX simples e profissional.

Entregue:

* Código funcional  
* Arquivos alterados  
* Como criar manualmente um usuário e vincular à clínica

Critério de aceite:

* Login funcionando.  
* `/admin` protegido.  
* Clínica logada identificada.  
* Logout funcionando.

\-----Fase 4 — CRUD do AdminPrompt para Codex

Substitua os dados mockados do painel `/admin` por dados reais do Supabase.

Telas:

* Dashboard  
* Profissionais  
* Serviços  
* Agendamentos  
* Pacientes  
* Pacotes & Sessões  
* Financeiro  
* Relatórios  
* AI Growth Engine

Regras:

1. Toda consulta deve filtrar por `clinica_id` da clínica logada.  
2. Criar funções de listagem, criação, edição e exclusão quando a tela tiver botão correspondente.  
3. Preservar layout atual.  
4. Mostrar loading state.  
5. Mostrar empty state quando não houver dados.  
6. Mostrar toast ou mensagem visual em ações de sucesso/erro.  
7. Não refatorar o app inteiro.  
8. Não mexer em CSS global sem necessidade.

Prioridade:

1. Profissionais  
2. Serviços  
3. Pacientes  
4. Agendamentos  
5. Financeiro  
6. Pacotes  
7. Relatórios  
8. IA

Entregue cada etapa funcionando.

Critério de aceite:

* Dados reais aparecem no admin.  
* Criar, editar e excluir funcionam onde houver UI.  
* Mocks removidos progressivamente.  
* Nenhuma tela quebra quando o banco está vazio.

\-----Fase 5 — Página Pública de AgendamentoPrompt para Codex

Conecte a rota pública `/agendar/[slug]` ao Supabase.

Objetivo:

Permitir que pacientes façam agendamento online sem login.

Fluxo:

1. Buscar clínica pelo slug.  
2. Listar profissionais ativos da clínica.  
3. Ao selecionar profissional, listar serviços ativos daquele profissional.  
4. Mostrar horários disponíveis com base no JSON de horários do profissional.  
5. Bloquear horários já ocupados na tabela `agendamentos`.  
6. Criar ou localizar paciente pelo WhatsApp.  
7. Criar agendamento com status "pendente".  
8. Exibir mensagem de sucesso.

Regras:

* Não expor dados financeiros internos.  
* Não mostrar dados de outros pacientes.  
* Validar nome e WhatsApp.  
* Não permitir agendamento duplicado no mesmo profissional, data e horário.  
* Manter interface atual.

Entregue:

* Código funcional  
* Ajustes necessários nas políticas RLS  
* SQL adicional se precisar de função RPC segura

Critério de aceite:

* Paciente agenda sem login.  
* Horário ocupado não aparece ou é bloqueado.  
* Agendamento entra como pendente.  
* Dados privados continuam protegidos.

\-----Fase 6 — FinanceiroPrompt para Codex

Conecte o módulo Financeiro aos dados reais do Supabase.

Tarefas:

1. Listar pagamentos.  
2. Criar pagamento.  
3. Editar pagamento.  
4. Alterar status:  
   * pago  
   * pendente  
   * atrasado  
   * cancelado  
5. Listar despesas.  
6. Criar despesa.  
7. Editar despesa.  
8. Calcular:  
   * Receita do mês  
   * Despesas do mês  
   * Lucro estimado  
   * Inadimplência  
   * Faturamento previsto

Regras:

* Sempre filtrar por `clinica_id`.  
* Não expor financeiro na rota pública.  
* Preservar layout visual.  
* Criar loading, empty state e tratamento de erro.

Critério de aceite:

* Financeiro mostra dados reais.  
* KPIs calculados corretamente.  
* Despesas e pagamentos persistem no Supabase.

\-----Fase 7 — Pacotes & SessõesPrompt para Codex

Conecte a tela Pacotes & Sessões aos dados reais do Supabase.

Tarefas:

1. Listar pacotes de sessão.  
2. Criar pacote vinculado a paciente e serviço.  
3. Editar pacote.  
4. Registrar sessão realizada.  
5. Calcular sessões restantes.  
6. Atualizar status automaticamente:  
   * ativo  
   * finalizado  
   * vencido

Regras:

* Sempre filtrar por `clinica_id`.  
* Preservar barras de progresso e layout atual.  
* Se `sessoes_realizadas` \>= `total_sessoes`, marcar como finalizado.  
* Se `validade` \< hoje e ainda houver saldo, marcar como vencido.

Critério de aceite:

* Pacotes persistem no banco.  
* Registrar sessão atualiza saldo.  
* Status funciona.

\-----Fase 8 — RelatóriosPrompt para Codex

Conecte a tela de Relatórios aos dados reais do Supabase.

KPIs:

* Ocupação média da agenda  
* Faturamento do período  
* Ticket médio  
* Taxa de faltas  
* Pacientes ativos  
* Pacientes inativos  
* Retornos pendentes  
* Inadimplência

Gráficos:

* Evolução do faturamento por mês  
* Ocupação por profissional  
* Ranking de profissionais por faturamento  
* Ranking por número de atendimentos  
* Serviços mais vendidos

Filtros:

* Hoje  
* Semana  
* Mês  
* Trimestre  
* Período personalizado  
* Profissional

Regras:

* Usar dados reais das tabelas `agendamentos`, `pagamentos`, `pacientes`, `profissionais` e `servicos`.  
* Filtrar sempre por `clinica_id`.  
* Manter design.  
* Exibir estado vazio se não houver dados suficientes.

Critério de aceite:

* Filtros alteram os dados.  
* KPIs batem com os registros.  
* Gráficos não quebram sem dados.

\-----Fase 9 — AI Growth EnginePrompt para Codex

Implemente a lógica real do AI Growth Engine usando dados do Supabase.

Módulos:

1. Ociosidade por profissional

Calcular:

`ocupacao = agendamentos_confirmados / slots_disponiveis * 100`Mostrar:

* Profissional  
* Ocupação semanal  
* Horários com baixa ocupação  
* Sugestão de ação  
1. Pacientes inativos

Detectar pacientes sem atendimento há:

* 30 dias  
* 60 dias  
* 90 dias  
1. Retornos pendentes

Detectar pacientes com `proximo_retorno` menor que hoje e sem novo agendamento futuro.

1. Faltas

Calcular taxa de status \= "faltou" por profissional e por horário.

1. Oportunidade financeira

Estimar dinheiro perdido com:

* Slots vazios  
* Retornos pendentes  
* Pacientes inativos  
* Faltas  
* Pagamentos atrasados

Regras:

* Pode começar com cálculo no frontend.  
* Criar funções reutilizáveis.  
* Não precisa IA generativa real ainda.  
* Gerar sugestões automáticas com templates.  
* Preservar visual atual.

Entregue:

* Funções criadas  
* Componentes atualizados  
* Fórmulas usadas

Critério de aceite:

* AI Growth Engine usa dados reais.  
* Mostra oportunidades reais.  
* Não depende mais apenas de mock.

\-----Fase 10 — Mensagens de WhatsAppPrompt para Codex

Adicione geração de mensagens prontas para WhatsApp dentro do AI Growth Engine.

Casos:

1. Paciente inativo  
2. Retorno pendente  
3. Horário ocioso  
4. Pagamento atrasado  
5. Falta recorrente

Regras:

* Não integrar WhatsApp real ainda.  
* Gerar texto pronto para copiar.  
* Usar variáveis:  
  * nome do paciente  
  * nome da clínica  
  * profissional  
  * serviço  
  * data sugerida  
* Criar botão "Copiar mensagem".  
* Criar botão "Abrir no WhatsApp" usando `wa.me` quando houver número.

Exemplo:

Olá, \[nome\]. Aqui é da \[clínica\]. Percebemos que seu retorno está pendente e temos alguns horários disponíveis esta semana. Deseja que eu verifique o melhor horário para você?

Critério de aceite:

* Mensagem gerada por contexto.  
* Botão copiar funciona.  
* `wa.me` funciona quando houver WhatsApp válido.

\-----Fase 11 — Auditoria de SegurançaPrompt para Codex

Faça uma auditoria de segurança no projeto Clinic Pro com Supabase.

Verifique:

1. Se nenhuma `service_role` key está no frontend.  
2. Se todas as queries privadas filtram por `clinica_id`.  
3. Se as rotas `/admin` estão protegidas.  
4. Se a página pública `/agendar/[slug]` não expõe dados sensíveis.  
5. Se RLS está ativo em todas as tabelas.  
6. Se pacientes não conseguem acessar dados de outros pacientes.  
7. Se financeiro não é público.  
8. Se as variáveis `.env` estão corretas.  
9. Se há risco de agendamento duplicado.  
10. Se há validação mínima nos formulários.

Corrija apenas o necessário.

Não altere design.

Entregue relatório objetivo do que foi corrigido.

Critério de aceite:

* Nenhuma chave crítica exposta.  
* RLS validado.  
* Financeiro privado.  
* Admin protegido.  
* Agendamento público seguro.

\-----Fase 12 — Build FinalPrompt para Codex

Execute validação final do projeto Clinic Pro.

Tarefas:

1. Rodar build.  
2. Corrigir erros de TypeScript, lint ou import.  
3. Testar rotas principais:  
   * `/login`  
   * `/admin`  
   * `/agendar/[slug]`  
4. Conferir se dados reais aparecem no admin.  
5. Conferir se página pública agenda corretamente.  
6. Conferir se não há mocks críticos ainda ativos.  
7. Conferir responsividade mobile.  
8. Conferir se variáveis de ambiente estão documentadas.

Regras:

* Não mudar design.  
* Não refatorar sem necessidade.  
* Corrigir apenas bugs reais.

Entregue:

* Relatório final  
* Pendências restantes, se houver  
* Instruções para deploy

\-----Ordem de execução

1. Fase 1 — Conectar Supabase  
2. Fase 2 — Schema SQL  
3. Rodar SQL manualmente no Supabase  
4. Fase 3 — Auth  
5. Criar primeiro usuário manualmente no Supabase Auth  
6. Vincular usuário à tabela clinicas  
7. Fase 4 — CRUD Admin  
8. Fase 5 — Página Pública  
9. Fase 6 — Financeiro  
10. Fase 7 — Pacotes & Sessões  
11. Fase 8 — Relatórios  
12. Fase 9 — AI Growth Engine  
13. Fase 10 — Mensagens WhatsApp  
14. Fase 11 — Auditoria  
15. Fase 12 — Build Final

