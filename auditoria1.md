# Auditoria Completa do Sistema — Análise Saúde System (ClinicPro + Deby AI)

> **Data:** 2026-05-21  
> **Versão auditada:** Estado atual do repositório local  
> **Auditado por:** Claude Code (auditoria automatizada com análise crítica)  
> **Nota:** Nenhum valor de chave, token, senha ou segredo foi revelado neste documento.

---

## 1. Visão Geral do Projeto

O **Análise Saúde System** é uma plataforma de gestão operacional para clínicas de saúde, desenvolvida em React 18 + TypeScript com backend em Supabase (PostgreSQL + Edge Functions em Deno). O sistema cobre agenda, prontuário eletrônico, financeiro, pacientes, leads, WhatsApp e uma IA operacional chamada Deby AI.

### Estrutura em números

| Métrica | Quantidade |
|--------|------------|
| Páginas React | 3 (Login, Admin, Booking público) |
| Módulos dentro do Admin | 13 |
| Tabelas no banco | 30+ |
| Edge Functions | 9 |
| Migrations SQL | 17 |
| Serviços frontend | 9 |
| Componentes React | 50+ |
| Buckets de Storage | 2 |

### Nível de maturidade

O projeto está em **fase de MVP funcional** — o esqueleto opera, os módulos principais existem e há lógica real de negócio. Porém, há código morto significativo, bugs de segurança no frontend, inconsistências entre integrações e funcionalidades incompletas que impedem o uso em produção com confiança. Existe potencial claro, mas o sistema ainda não está pronto para uma clínica real sem as correções listadas neste documento.

---

## 2. Auditoria Pela Visão da Secretária

### Como a secretária usaria o sistema

A secretária passa o dia alternando entre: responder WhatsApp, confirmar agendamentos, cadastrar pacientes novos, cobrar pendências e fechar o caixa ao fim do expediente. Qualquer fricção nessas tarefas custa tempo e gera erros.

### Pontos positivos

- Existe um módulo de **Caixa** separado, acessível pela secretária, sem expor o financeiro completo.
- O **Kanban de Pacientes** dá uma visão rápida de quem está em que estágio (novo, agendado, atendido, retorno, faltou, inativo).
- O módulo de **WhatsApp** integrado permite responder mensagens sem sair do sistema.
- O filtro por profissional, status e data na agenda funciona e é intuitivo.
- A secretária pode visualizar apenas os módulos permitidos para seu perfil (a navegação oculta os módulos restritos).
- É possível enviar mensagem de WhatsApp diretamente da ficha do paciente.
- Importação de pacientes em lote por Excel existe e está implementada.

### Problemas encontrados

1. **Formulário de agendamento em linha única** — O código do `AppointmentsPanel` tem um formulário JSX inteiro em uma única linha de 1000+ caracteres. Isso não afeta o usuário diretamente, mas indica que a tela foi construída rapidamente e pode ter bugs difíceis de rastrear (campos misturando dados de paciente selecionado com nome avulso).

2. **Campo "Nome avulso" e "Paciente" coexistem sem regra clara** — A secretária pode selecionar um paciente cadastrado *e* preencher um nome avulso ao mesmo tempo. Não está claro qual prevalece. Isso pode gerar agendamentos soltos sem vínculo com o cadastro real.

3. **Sem confirmação automática de consulta por WhatsApp** — A secretária precisa confirmar consultas manualmente. Não há automação de lembrete via WhatsApp antes do horário.

4. **Sem busca rápida de paciente por telefone** — Para encontrar um paciente que liga, a secretária precisa digitar o nome. Não há campo de busca por número de WhatsApp diretamente na lista de pacientes.

5. **Caixa sem histórico retroativo visível** — O módulo de Caixa funciona para fechamento do dia, mas não exibe claramente o histórico de dias anteriores em formato consultável pela secretária.

6. **Leads e WhatsApp são módulos separados sem ponte clara** — Para transformar uma conversa de WhatsApp em lead, a secretária precisa navegar para o módulo de Leads separadamente. No WhatsApp existe um botão para criar lead a partir da conversa, mas o fluxo não é guiado.

7. **Sem atalho para "novo agendamento rápido"** — A secretária precisa rolar até o formulário, preencher todos os campos e salvar. Não há um botão de ação rápida ou modal simplificado.

8. **Dois sistemas de WhatsApp causam confusão** — Evolution API e WAHA coexistem no código. O painel de WhatsApp usa Evolution API, mas existem serviços e tabelas para os dois. Caso algo dê errado, a secretária não sabe qual está ativo.

### Melhorias recomendadas

- Criar um **modal de agendamento rápido** com os campos mínimos.
- Implementar **lembretes automáticos por WhatsApp** (D-1 e D-0 do agendamento).
- Adicionar **busca por número de telefone** em pacientes.
- Unificar o fluxo de WhatsApp → Lead em um único passo guiado.
- Exibir histórico de fechamentos de caixa dos últimos 30 dias no módulo Caixa.

### Funcionalidades que deveriam existir

- Confirmação de consulta com 1 clique (que envia WhatsApp automático ao paciente).
- Alerta visual de pacientes com retorno vencido.
- Painel de tarefas do dia para a secretária (agendamentos confirmados, pendentes, encaixes).

---

## 3. Auditoria Pela Visão do Médico

### Como o médico usaria o sistema

O médico abre o sistema antes de cada consulta, revisa o histórico do paciente, faz a evolução durante ou após o atendimento, e eventualmente prescreve ou adiciona arquivos. A velocidade e clareza durante a consulta são críticas.

### Pontos positivos

- **Prontuário eletrônico** existe com campos de queixa, evolução e conduta.
- Há uma **timeline de prontuário** que mostra o histórico de atendimentos em ordem cronológica.
- O **log de acessos ao prontuário** (`prontuario_acessos`) existe para auditoria.
- O médico vê apenas seus próprios pacientes e agendamentos (filtro por `profissional_id`).
- A Deby AI pode organizar notas livres em estrutura clínica (queixa, achados, evolução, conduta).
- Existe suporte a **anexos de prontuário** (bucket `prontuarios` no Storage).

### Problemas encontrados

1. **Prontuário acessado dentro da ficha do paciente, sem destaque** — Não é claro no fluxo que o prontuário está ali. O médico precisa abrir a ficha do paciente para chegar ao prontuário. Não existe atalho direto "abrir prontuário do próximo paciente".

2. **Sem confirmação de atendimento para avançar o status** — Após a consulta, o médico não tem um botão de "concluir atendimento" que mude automaticamente o status do agendamento para "concluído".

3. **Sem prescrição** — Não existe funcionalidade de prescrição médica ou modelo de receituário. Sugestão futura.

4. **Sem solicitar exame** — Não há campo para solicitação de exames ou integração com laboratório.

5. **Deby AI no prontuário é manual** — O médico precisa acionar a IA explicitamente clicando em um botão. A IA não sugere estruturação automaticamente ao detectar texto livre sendo digitado.

6. **Sem alertas clínicos** — Não há alertas automáticos para: alergias cadastradas, tempo desde o último atendimento, retorno vencido, etc.

7. **Módulo do médico é restrito, mas sem painel próprio** — O profissional vê "Dashboard, Agendamentos, Pacientes, Kanban Pacientes" — porém o Dashboard mostra KPIs globais da clínica (receita, previsão), incluindo dados financeiros que o médico não deveria ver diretamente.

8. **Prontuário sem campo de alergias, medicamentos em uso ou antecedentes fixos** — A estrutura do prontuário é baseada em notas livres. Não há campos fixos de anamnese estruturada.

### Melhorias recomendadas

- Criar um painel de atendimento dedicado ao médico: lista dos pacientes do dia com botão de "iniciar atendimento" e "concluir atendimento".
- Filtrar o Dashboard do médico para mostrar apenas seus próprios dados (seus agendamentos, seus pacientes), sem expor KPIs financeiros globais.
- Adicionar campos fixos de anamnese ao prontuário: alergias, medicamentos em uso, antecedentes.
- Integrar Deby AI com sugestão automática ao começar a digitar a evolução.

### Funcionalidades que deveriam existir

- Prescrição médica com modelo imprimível/PDF.
- Solicitação de exames com template.
- Alerta de alergias ao abrir prontuário.
- Histórico de todos os atendimentos anteriores com timeline visual clara.
- Assinatura digital ou confirmação de prontuário após consulta.

---

## 4. Auditoria Pela Visão do Dono/Admin da Clínica

### Como o dono usaria o sistema

O dono quer saber: quanto entrou, quanto saiu, quais médicos estão produzindo, quantos pacientes novos chegaram, quantos leads viraram consulta, e se a equipe está usando o sistema corretamente.

### Pontos positivos

- **Dashboard** com KPIs básicos: total de consultas, ocupação, profissionais ativos, receita prevista.
- **Módulo Financeiro** com receitas, despesas, inadimplência e lucro.
- **Módulo de Leads** com Kanban por temperatura (frio, morno, quente).
- **Módulo de Acessos** para gerenciar usuários e seus perfis.
- **Relatórios** básicos por agendamento, faturamento, pacientes e leads.
- **Deby AI** com insights financeiros (restrito ao admin) e de agenda.
- Suporte multi-profissional e multi-usuário com roles bem definidos.
- **Exportação financeira para Excel** via ExportPage.

### Problemas encontrados

1. **Dashboard com gráfico de dados falsos** — O gráfico semanal exibe alturas estáticas hardcoded (`CHART_HEIGHTS = [42, 66, 84, 55, 72, 31, 48]`) e mostra o texto "Dados de demonstração" mesmo em modo produção. Isso é enganoso e não confiável para tomada de decisão.

2. **KPI de "Ocupação Média" é calculado de forma incorreta** — Usa `appointments.filter(confirmado).length / (professionals.length * 40)`. Divide pelo número de profissionais vezes 40 (assumindo 40 consultas/semana por profissional), mas não considera os horários reais cadastrados por profissional.

3. **Sem visão de receita por profissional** — Não é possível ver quanto cada médico gerou de receita individualmente no período.

4. **Relatórios básicos sem gráficos** — Os relatórios existem mas são tabulares, sem visualizações. Para o dono tomar decisões rápidas, gráficos de linhas (faturamento por mês) e pizza (receita por serviço) seriam essenciais.

5. **Funil de conversão lead → paciente não existe como métrica** — O sistema tem Leads e Pacientes separados, mas não calcula automaticamente quantos leads viraram pacientes no período.

6. **Sem relatório de inadimplência por paciente** — Sabe-se o total em atraso, mas não quem são os pacientes devedores e o que devem.

7. **Sem controle de metas** — Não é possível definir uma meta de faturamento mensal e ver o percentual atingido.

8. **Sem visão da agenda por semana/mês** — O módulo de Agendamentos tem um ClinicCalendar, mas o Dashboard não mostra a densidade de agenda para o dono prever períodos ociosos.

### Melhorias recomendadas

- Substituir o gráfico estático por dados reais de agendamentos dos últimos 7 dias.
- Adicionar visão de receita por profissional no Financeiro.
- Implementar gráficos de linhas para faturamento mensal e barras para comparativo.
- Criar métrica de conversão de leads com funil visual.
- Relatório de inadimplência com nome do paciente, valor e dias em atraso.

### Funcionalidades que deveriam existir

- Metas de faturamento mensais com acompanhamento.
- Notificação/alerta para o admin quando um pagamento atrasa.
- Comparativo mês a mês de receita, despesas e lucro.
- Relatório de retenção de pacientes (voltaram vs. não voltaram).
- Exportação de relatórios em PDF além de Excel.

---

## 5. Auditoria de UX/UI

### Estado visual atual

O sistema usa Tailwind CSS com um design system próprio baseado em tokens de cor (primary teal, charcoal, surface). A tipografia e o sistema de cards são consistentes. A aparência é **adequada, mas não premium** — parece um sistema interno funcional, não um produto SaaS polido.

### Pontos positivos

- Consistência de cores e tokens entre os módulos.
- SectionCard padroniza a apresentação de conteúdo.
- StatusPill e StatusBadge dão feedback visual de status.
- Hierarquia visual clara no cabeçalho da página (nome do módulo em destaque).
- EmptyState implementado corretamente para listas vazias.
- O módulo WhatsApp ocupa tela cheia sem padding lateral (correto para chat).

### Problemas encontrados

1. **Gráfico do Dashboard mostra "Dados de demonstração"** mesmo no modo produção. É confuso e destrói a confiança do dono.

2. **Formulários densos sem separação visual** — Em Agendamentos e Pacientes, os campos do formulário ficam todos na mesma grid sem separação por contexto (dados pessoais, dados do agendamento, etc.).

3. **Mobile não foi validado** — Os módulos usam grids responsivos (`md:grid-cols-4`), mas a maioria dos formulários provavelmente fica inutilizável em telas pequenas com tantos campos side-by-side.

4. **Módulo de Agenda não tem visão semanal/mensal do calendário integrada ao form** — O calendário existe (`ClinicCalendar`), mas aparece abaixo da lista e não é a interface principal de agendamento.

5. **Loading states inconsistentes** — Alguns módulos mostram spinner durante carregamento, outros ficam em branco. Não há um skeleton loader padronizado.

6. **Estados de erro não são amigáveis** — Erros do Supabase são exibidos como mensagem técnica genérica (ex.: "Erro ao carregar dados"). Não há sugestão de ação para o usuário.

7. **Sem toast/notificação de feedback ao salvar** — Após salvar um paciente, agendamento ou serviço, não há feedback visual claro de sucesso (toast). O usuário fica sem confirmação.

8. **Prontuário sem destaque na ficha do paciente** — O prontuário fica dentro de um modal/painel da ficha do paciente sem hierarquia visual que o destaque como o elemento mais importante para o médico.

9. **Sidebar de navegação sem ícones** — Os módulos aparecem só como texto na sidebar. Ícones por módulo melhorariam a navegação visual.

10. **ExportPage existe mas não está na navegação** — Há uma página de exportação financeira (`ExportPage.tsx`) que não tem rota registrada em `App.tsx` e não aparece no menu. É código órfão ou em desenvolvimento.

### Melhorias recomendadas

- Adicionar ícones Lucide na sidebar para cada módulo.
- Implementar toast de sucesso/erro após cada ação de salvar ou excluir.
- Criar skeleton loaders padronizados para estados de carregamento.
- Separar formulários em seções visuais com `fieldset` ou `SectionCard` internos.
- Substituir o gráfico estático por componente real com dados dos últimos 7 dias.
- Validar e ajustar layout mobile em todos os módulos críticos (Agenda, Pacientes, Caixa).

---

## 6. Auditoria Técnica

### Organização do código

A estrutura de pastas tem uma inconsistência central: existem dois conjuntos de componentes que fazem a mesma coisa.

**Conjunto A (legado/morto):** `src/components/admin/`
- `Dashboard.tsx`, `Professionals.tsx`, `Services.tsx`, `Appointments.tsx`, `Finance.tsx`, `Reports.tsx`, `PackagesSessions.tsx`, `AIGrowthEngine.tsx`

**Conjunto B (em uso):** `src/pages/admin/modules/`
- `DashboardPanel.tsx`, `ProfessionalsPanel.tsx`, `ServicesPanel.tsx`, `AppointmentsPanel.tsx`, `FinancePanel.tsx`, `ReportsPanel.tsx`, `PackagesPanel.tsx`

O `AdminPage` importa exclusivamente do Conjunto B. Os arquivos do Conjunto A **não são importados em nenhuma rota ativa** e representam código morto a ser removido.

### Outros problemas técnicos

1. **`AIPanel.tsx` existe mas não está no menu de módulos** — O arquivo `src/pages/admin/modules/AIPanel.tsx` está presente mas não é referenciado em `AdminPage.tsx`. Código morto ou em desenvolvimento sem status claro.

2. **`ExportPage.tsx` sem rota** — A página de exportação existe mas não aparece em `App.tsx`. Não há como o usuário chegar até ela pela interface.

3. **`useClinicData` é um hook gigante** — Todo o estado da aplicação (profissionais, serviços, pacientes, agendamentos, financeiro, pacotes, usuários) está em um único hook de centenas de linhas. Isso viola o princípio de responsabilidade única e torna o código difícil de testar e manter.

4. **Carregamento "tudo de uma vez" sem paginação** — `useClinicData` busca todos os dados em `Promise.all` sem paginação. Com uma clínica de 2.000 pacientes e 10.000 agendamentos, isso vai causar timeouts e lentidão grave.

5. **`AppointmentsPanel.tsx` tem JSX em linha única** — O formulário e a tabela de agendamentos são escritos em linhas de mais de 1000 caracteres. É impossível revisar, depurar ou manter esse código.

6. **Modo demo com dados fictícios misturado ao código de produção** — A flag `isDemoMode` está espalhada pelo código com dados mock (`mockData.ts`) incluídos no bundle de produção. Isso aumenta o tamanho do bundle e representa um risco de mostrar dados falsos em produção por acidente.

7. **`AuthContext` tem função `loadClinicData` fora do `useMemo`/`useCallback`** — A função `loadClinicData` é declarada dentro do `useEffect` mas referenciada em múltiplos lugares. Isso pode causar problemas de closures desatualizadas.

8. **Dois sistemas WhatsApp com tabelas duplicadas** — WAHA e Evolution API têm tabelas separadas no banco: `whatsapp_contatos/conversas/mensagens` (WAHA) e `whatsapp_contacts/conversations/messages` (Evolution). O painel usa Evolution. As tabelas WAHA acumulam dados ou ficam vazias sem propósito claro.

9. **Sem tratamento de erros padronizado** — Alguns lugares usam `try/catch` com `console.error`, outros ignoram erros silenciosamente. Não há logger centralizado.

10. **Sem testes** — Zero arquivos de teste (unitários, integração ou E2E) identificados no projeto.

### Melhorias técnicas recomendadas

- Remover o Conjunto A de componentes (`src/components/admin/`) — são código morto.
- Quebrar `useClinicData` em hooks menores por domínio (ex.: `usePatientsData`, `useFinanceData`).
- Implementar paginação nas consultas ao Supabase.
- Extrair o modo demo para um provider separado que nunca chega ao bundle de produção.
- Formatar `AppointmentsPanel` com Prettier e separar em sub-componentes.
- Adicionar pelo menos testes unitários para as funções de validação e formatação.

---

## 7. Auditoria do Banco de Dados

### Estrutura geral

O banco está bem estruturado com 17 migrations aplicadas em ordem. RLS está habilitado em todas as tabelas principais. Há funções SQL auxiliares bem nomeadas (`is_clinic_admin`, `is_clinic_staff`, `is_clinic_member`). Os índices cobrem os campos de filtro mais comuns (`clinica_id`, `data`, `status`).

### Pontos positivos

- Multi-tenant desde o início com `clinica_id` em todas as tabelas de dados.
- RLS implementado com funções reutilizáveis.
- Log de acesso ao prontuário (`prontuario_acessos`) — boa prática de auditoria.
- Log de uso de IA (`ai_usage_logs`) — rastreabilidade.
- Tabela de fechamentos de caixa (`fechamentos_caixa`).

### Problemas encontrados

1. **Tabelas duplicadas para WhatsApp** — Existem dois conjuntos de tabelas de WhatsApp:
   - `whatsapp_contatos`, `whatsapp_conversas`, `whatsapp_mensagens` (WAHA, snake_case sem plural)
   - `whatsapp_contacts`, `whatsapp_conversations`, `whatsapp_messages` (Evolution API, em inglês)
   
   Isso é redundância direta. Se apenas a Evolution API está em uso, as tabelas WAHA devem ser removidas após migração de dados.

2. **Campo `kanban_stage` em `pacientes`** — O estágio de Kanban do paciente está diretamente na tabela de pacientes. Se a clínica quiser múltiplos kanbans ou estágios customizados, isso vai requerer refatoração.

3. **Financeiro sem separação por centro de custo ou profissional** — Pagamentos têm `profissional_id` e `servico_id`, mas despesas não têm categorização por centro de custo real. Relatórios DRE por médico ficam limitados.

4. **`pacientes.valor_total_gasto` é um campo calculado armazenado** — Esse valor deveria ser calculado dinamicamente a partir dos pagamentos, não armazenado manualmente. Pode ficar desatualizado se um pagamento for cancelado retroativamente.

5. **Sem tabela de prontuário estruturado** — O prontuário atual é texto livre em campos como `queixa`, `evolucao`, `conduta`. Não há suporte a campos de anamnese estruturada (alergias, medicamentos, antecedentes).

6. **Sem tabela de prescrições** — Inexistente. Seria necessária para um sistema médico completo.

7. **`clinicas` sem campos de CNPJ, endereço, telefone** — Para emissão de documentos ou relatórios com cabeçalho da clínica, esses campos fazem falta.

8. **Tabela `notificacoes` existe mas sem uso aparente no frontend** — Foi criada em migration mas não há componente React consumindo notificações persistidas do banco.

9. **`push_notifications` criado mas sem uso funcional confirmado** — A estrutura existe mas o fluxo completo de push notification não está operacional.

### Necessidades futuras (preparação para SaaS)

- Adicionar `plan` ou `subscription_tier` na tabela `clinicas`.
- Adicionar campos de CNPJ, endereço e telefone na tabela `clinicas`.
- Criar tabela de `prescricoes` com modelo de receituário.
- Criar tabela de `anamnese` com campos estruturados por especialidade.
- Remover tabelas WAHA duplicadas após consolidar em um único sistema.
- Substituir `valor_total_gasto` por view calculada.

---

## 8. Auditoria de Segurança

### Resumo executivo de riscos

| Nível | Quantidade | Impacto |
|-------|------------|---------|
| Crítico | 2 | Exposição de dados, acesso indevido |
| Alto | 4 | Custo descontrolado, falha de autenticação |
| Médio | 4 | Conformidade LGPD, escalabilidade |
| Baixo | 3 | Qualidade, monitoramento |

---

### CRÍTICO

#### C-01: Role padrão "admin" no frontend quando o perfil não carrega

**Onde aparece:** `src/contexts/AuthContext.tsx`, linha 146:
```typescript
role: profile?.role ?? "admin",
```

**Por que é perigoso:** Se por qualquer motivo o perfil do usuário não for carregado (falha de rede, timeout, race condition), o `role` é definido como `"admin"` por padrão. O `AdminPage` usa esse `role` para decidir quais módulos mostrar (`visibleModules`). Um usuário que deveria ter acesso de secretária ou profissional pode visualizar módulos de admin (Financeiro, Relatórios, Acessos) enquanto a sessão estiver em estado parcialmente carregado.

**Atenuante parcial:** O RLS do Supabase ainda bloquearia as queries de dados sensíveis. Mas a UI expõe os módulos indevidamente.

**Como corrigir:** Trocar o fallback:
```typescript
role: profile?.role ?? "secretaria",  // mínimo privilégio
```
Ou melhor: não renderizar nada enquanto `profile` é null e `loading` é false — exibir erro de sessão e forçar novo login.

---

#### C-02: Variável de ambiente sensível incorreta na Edge Function deby-ai

**Onde aparece:** `supabase/functions/deby-ai/index.ts`, linha 50:
```typescript
const apiKey = env("OPENAI_API_KEY");
```

**Por que é perigoso:** O arquivo `.env.local` define `OPENROUTER_API_KEY`, não `OPENAI_API_KEY`. A Edge Function busca uma variável com nome diferente do que foi configurado. Isso significa que:
- A função vai **falhar em produção** com `Missing OPENAI_API_KEY` se apenas `OPENROUTER_API_KEY` estiver configurada nos segredos do Supabase.
- Ou pior: se alguém configurou ambas nos Supabase Secrets com nomes diferentes, existe confusão sobre qual chave e qual endpoint está sendo usado de fato.

A linha 55 aponta para `https://api.openai.com/v1/responses` (endpoint OpenAI Responses API), enquanto o `.env.local` aponta para OpenRouter. Há inconsistência entre a integração real e a documentada.

**Como corrigir:** Padronizar o nome da variável e o endpoint. Se a escolha é OpenRouter, usar `OPENROUTER_API_KEY` e `https://openrouter.ai/api/v1/chat/completions`.

---

### ALTO

#### A-01: CORS aberto em todas as Edge Functions

**Onde aparece:** `supabase/functions/_shared/http.ts`, linha 2:
```typescript
"Access-Control-Allow-Origin": "*",
```

**Por que é perigoso:** Qualquer site na internet pode chamar as Edge Functions com uma requisição de outra origem. Embora a autenticação via JWT proteja os dados, requisições OPTIONS (preflight) ficam acessíveis sem autenticação. Em edge functions de webhook (WAHA, Evolution), um atacante pode enviar payloads e tentar explorar falhas de parsing.

**Como corrigir:** Restringir a origem ao domínio da aplicação:
```typescript
"Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://seu-dominio.com",
```

---

#### A-02: Segredo de webhook WAHA não verificado ou fraco

**Onde aparece:** `.env.local` define `WAHA_WEBHOOK_SECRET`. A verificação desse segredo no webhook handler precisa ser confirmada. Se a função `waha-webhook/index.ts` não valida a assinatura com este segredo antes de processar o payload, qualquer pessoa que conheça a URL do webhook pode injetar mensagens falsas.

**Por que é perigoso:** Mensagens fabricadas poderiam criar leads falsos, conversa falsas ou até disparar respostas automáticas da IA para contatos reais.

**Como corrigir:** Garantir que `waha-webhook` valida o header `x-waha-signature` com HMAC usando o segredo, antes de qualquer processamento.

---

#### A-03: Deby AI sem rate limiting

**Onde aparece:** `supabase/functions/deby-ai/index.ts` — não há nenhum controle de limite de requisições por usuário ou por clínica.

**Por que é perigoso:** Qualquer usuário autenticado (secretária, profissional) pode chamar a função repetidamente, gerando custos ilimitados de API (OpenAI/OpenRouter). Um loop acidental no frontend ou um usuário mal-intencionado pode gerar centenas de chamadas em minutos.

**Como corrigir:** Implementar rate limiting por `user_id` consultando `ai_usage_logs` com contagem de chamadas na última hora. Retornar 429 se exceder o limite.

---

#### A-04: Sem autenticação de dois fatores (2FA)

**Onde aparece:** `AuthContext.tsx` — apenas email + senha.

**Por que é perigoso:** Para um sistema que contém dados de saúde de pacientes (dados sensíveis pela LGPD), o acesso com apenas senha é insuficiente. Se a senha de um médico ou admin for comprometida, o atacante tem acesso total a prontuários, dados financeiros e contatos de pacientes.

**Como corrigir:** Habilitar 2FA via Supabase Auth (suporta TOTP com apps como Google Authenticator). Tornar obrigatório para perfil `admin` e opcional para demais.

---

### MÉDIO

#### M-01: Logs de IA registram volume de dados clínicos

**Onde aparece:** `supabase/functions/deby-ai/index.ts`, função `logUsage` — registra `input_chars` e `output_chars` (apenas contagem, não o texto). Isso está correto e não expõe o conteúdo.

**Porém:** Nada impede que no futuro alguém modifique o log para incluir o `input` completo, que pode conter dados clínicos. A LGPD exige que dados de saúde sejam tratados com proteção extra.

**Como corrigir:** Documentar explicitamente que logs de IA nunca devem registrar o conteúdo das notas clínicas. Adicionar comentário no código.

---

#### M-02: `.env.local` com segredos potencialmente rastreado no git

**Onde aparece:** Arquivo `.env.local` na raiz do projeto com variáveis sensíveis (chaves de API, URL do banco, etc.).

**Por que é perigoso:** Se este arquivo foi commitado ao repositório git em algum momento, o histórico preserva os valores mesmo após remoção. Qualquer pessoa com acesso ao repositório pode recuperar as chaves do histórico.

**Como corrigir:** Verificar com `git log --all -- .env.local` se o arquivo aparece no histórico. Se sim, usar `git filter-branch` ou BFG Repo Cleaner para remover. Adicionar `.env.local` ao `.gitignore`. Revogar e regenerar todas as chaves expostas.

---

#### M-03: Política de acesso público nas tabelas de agendamento e pacientes

**Onde aparece:** Migrations — anônimos (`anon`) podem fazer INSERT em `agendamentos` e `pacientes` para permitir o agendamento público.

**Por que é perigoso:** Não há validação de volume no banco. Um bot pode criar centenas de agendamentos e pacientes falsos, poluindo o banco e a agenda da clínica.

**Como corrigir:** Implementar rate limiting no endpoint público de agendamento via Edge Function (ao invés de insert direto do cliente). Adicionar CAPTCHA na página de agendamento público.

---

#### M-04: Senha do banco de dados exposta em variável de ambiente

**Onde aparece:** `.env.local` contém `SUPABASE_DB_URL` com usuário e senha do PostgreSQL diretamente na string de conexão.

**Por que é perigoso:** Conexão direta ao PostgreSQL com credenciais de administrador. Se esta URL vazar, um atacante tem acesso irrestrito ao banco, bypassando completamente o RLS.

**Como corrigir:** Esta URL só deve existir em ambientes de CI/CD para migrations, nunca no código da aplicação. No frontend e Edge Functions, usar sempre a anon key ou service role key via Supabase SDK.

---

### BAIXO

#### B-01: Endpoint WAHA exposto como URL pública

**Onde aparece:** `.env.local` define a URL do servidor WAHA como IP público com porta. Se este servidor não tem autenticação adequada, a instância de WhatsApp fica exposta.

**Como corrigir:** Garantir que o servidor WAHA exige `WAHA_API_KEY` em todos os endpoints e está atrás de firewall/proxy com HTTPS.

---

#### B-02: Sem log de ações administrativas

**Onde aparece:** Não há tabela de auditoria de ações do admin (quem excluiu qual paciente, quem alterou financeiro, etc.). Apenas o acesso ao prontuário é logado.

**Como corrigir:** Implementar log de auditoria para operações destrutivas: delete de paciente, exclusão de agendamento, alteração de usuário.

---

#### B-03: Sem política de senhas

**Onde aparece:** `AuthContext.tsx` → `registerClinic` não valida a força da senha além do mínimo do Supabase.

**Como corrigir:** Validar no frontend: mínimo 8 caracteres, pelo menos 1 número e 1 caractere especial.

---

## 9. Auditoria das Permissões por Perfil

### Mapeamento atual (implementado)

| Módulo | Admin | Secretária | Profissional |
|--------|-------|------------|--------------|
| Dashboard | ✅ | ✅ | ✅ |
| Profissionais (CRUD) | ✅ | ❌ | ❌ |
| Serviços | ✅ | ✅ | ❌ |
| Agendamentos | ✅ | ✅ | ✅ (seus) |
| Pacientes | ✅ | ✅ | ✅ (seus) |
| Leads | ✅ | ✅ | ❌ |
| WhatsApp | ✅ | ✅ | ❌ |
| Kanban Pacientes | ✅ | ✅ | ✅ (seus) |
| Caixa | ✅ | ✅ | ❌ |
| Financeiro | ✅ | ❌ | ❌ |
| Pacotes & Sessões | ✅ | ✅ | ❌ |
| Relatórios | ✅ | ❌ | ❌ |
| Acessos | ✅ | ❌ | ❌ |

### Problemas de permissão encontrados

1. **Dashboard do profissional exibe KPIs financeiros globais** — O `DashboardPanel` mostra "Receita Prevista" e "Inadimplência" para todos os perfis. O profissional não deveria ver dados financeiros da clínica.

2. **Secretária vê `Serviços` mas não deveria editar preços** — A secretária pode editar o preço de um serviço no módulo Serviços. O preço é dado sensível de negócio que deveria ser restrito ao admin.

3. **Fallback de role para "admin"** — Conforme apontado em C-01, se o perfil não carregar, qualquer usuário vira admin temporariamente no frontend.

### Sugestão de matriz ideal de permissões

| Funcionalidade | Admin | Secretária | Profissional | Financeiro (futuro) |
|---------------|-------|------------|--------------|---------------------|
| Ver dashboard geral | ✅ | ✅ (sem financeiro) | ✅ (só seus dados) | ✅ |
| Gerenciar profissionais | ✅ | ❌ | ❌ | ❌ |
| Ver/editar preços de serviços | ✅ | ❌ | ❌ | ✅ |
| Ver lista de serviços | ✅ | ✅ | ✅ (só os seus) | ✅ |
| CRUD agendamentos | ✅ | ✅ | ✅ (seus) | ❌ |
| Ver todos os pacientes | ✅ | ✅ | ❌ (só seus) | ❌ |
| Editar prontuário | ✅ | ❌ | ✅ (seus) | ❌ |
| Ver prontuário | ✅ | ❌ | ✅ (seus) | ❌ |
| Leads e Kanban de leads | ✅ | ✅ | ❌ | ❌ |
| Enviar WhatsApp | ✅ | ✅ | ❌ | ❌ |
| Fechar caixa | ✅ | ✅ | ❌ | ✅ |
| Ver financeiro completo | ✅ | ❌ | ❌ | ✅ |
| Criar/editar despesas | ✅ | ❌ | ❌ | ✅ |
| Relatórios de faturamento | ✅ | ❌ | ❌ | ✅ |
| Gerenciar usuários (Acessos) | ✅ | ❌ | ❌ | ❌ |
| Ver configurações da clínica | ✅ | ❌ | ❌ | ❌ |
| Excluir pacientes | ✅ | ❌ | ❌ | ❌ |
| Excluir agendamentos | ✅ | ✅ (pendentes) | ❌ | ❌ |

---

## 10. Funcionalidades Que Devem Ser Mantidas

- Sistema de autenticação com Supabase Auth.
- RLS com funções `is_clinic_admin`, `is_clinic_staff`, `is_clinic_member`.
- Módulo de WhatsApp com chat em tempo real (Evolution API).
- Kanban de leads com temperaturas.
- Prontuário eletrônico com timeline de atendimentos.
- Log de acesso ao prontuário (`prontuario_acessos`).
- Módulo de Caixa separado do Financeiro completo.
- Importação de pacientes em Excel.
- Deby AI com ações segmentadas por módulo.
- Agendamento público por slug (`/agendar/:slug`).
- Pacotes de sessões com controle de saldo.
- Módulo de Acessos para gerenciar usuários.
- Sistema de design com tokens de cor consistentes.
- PWA com service worker.

---

## 11. Funcionalidades Que Devem Ser Melhoradas

| Funcionalidade | Problema atual | Melhoria necessária |
|----------------|---------------|---------------------|
| Dashboard | Gráfico com dados falsos, KPIs imprecisos | Usar dados reais dos últimos 7 dias |
| Agenda | Formulário em linha única, sem confirmação automática | Refatorar formulário, adicionar lembretes por WhatsApp |
| Prontuário | Sem campos estruturados, Deby AI não é automática | Adicionar campos de anamnese, integrar IA contextual |
| Relatórios | Só tabelas, sem gráficos | Adicionar gráficos de linha e barra |
| Permissões | Role padrão "admin", preços editáveis pela secretária | Corrigir fallback, refinar permissões por ação |
| Deby AI | Sem rate limiting, endpoint inconsistente | Implementar limite por usuário/hora |
| Loading states | Inconsistentes entre módulos | Padronizar com skeleton loaders |
| Feedback de ações | Sem toast de sucesso/erro | Implementar sistema de toast global |
| WhatsApp | Dois sistemas (WAHA + Evolution) | Consolidar em Evolution API |
| Financeiro | Sem visão por profissional, sem metas | Adicionar DRE por profissional e meta mensal |

---

## 12. Funcionalidades Que Devem Ser Excluídas ou Simplificadas

1. **`src/components/admin/` inteiro** — Código morto (Dashboard, Professionals, Services, Appointments, Finance, Reports, PackagesSessions, AIGrowthEngine). Nenhum é usado no AdminPage atual. Remover.

2. **Tabelas WAHA no banco** — `whatsapp_contatos`, `whatsapp_conversas`, `whatsapp_mensagens` são redundantes com as tabelas da Evolution API. Se WAHA não for mais necessário, remover após confirmar que não há dados críticos.

3. **`AIPanel.tsx`** — Módulo de IA que existe mas não aparece no menu nem é importado. Deve ser completado ou removido.

4. **Campo `valor_total_gasto` em `pacientes`** — Dado calculado armazenado manualmente. Substituir por view ou query calculada a partir dos pagamentos.

5. **Modo Demo embutido no bundle de produção** — Os dados mock (`mockData.ts`) e a flag `isDemoMode` não deveriam fazer parte do bundle de produção. Extrair para um ambiente de demonstração separado.

6. **Slug gerado automaticamente no cadastro da clínica** — O slug é gerado no frontend sem validação de unicidade em tempo real. Se dois nomes gerarem o mesmo slug, o segundo vai falhar com erro pouco claro.

---

## 13. Funcionalidades Que Devem Ser Incrementadas

> Todas as sugestões abaixo são recomendações — nenhuma está implementada atualmente.

### IA e Automação

- **Lembrete automático de consulta por WhatsApp** — Enviar mensagem automática D-1 e D-0 confirmando o horário. Usar a Deby AI para personalizar a mensagem.
- **Resposta automática de WhatsApp fora do horário** — Detectar horário fora do expediente e responder automaticamente que a clínica retorna em breve.
- **Estruturação automática de prontuário** — Ao detectar texto livre no campo de evolução, a Deby AI sugere a estrutura (queixa, achados, evolução, conduta) sem o médico precisar clicar em nada.
- **Análise de leads por IA** — Ao abrir um lead, a Deby AI classifica automaticamente a temperatura e sugere o próximo passo.
- **Resumo diário automático para o admin** — Toda manhã, a Deby AI gera um resumo do dia anterior (faturamento, faltas, novos pacientes) e envia por WhatsApp ou exibe no Dashboard.

### Clínica e Operação

- **Confirmação de consulta com 1 clique** — Botão na agenda que envia WhatsApp ao paciente e muda o status para "confirmado".
- **Painel de atendimento do médico** — Lista do dia para o profissional com botões de "iniciar" e "concluir" atendimento.
- **Prescrição médica** — Editor de prescrição com template por especialidade e exportação em PDF.
- **Solicitação de exames** — Modelo de pedido de exame com exportação em PDF.
- **Anamnese estruturada** — Campos fixos de alergias, medicamentos em uso, antecedentes familiares e pessoais no prontuário.
- **Alertas de retorno vencido** — Notificação automática para secretária quando um paciente não volta após o prazo de retorno.

### Financeiro e Gestão

- **DRE por profissional** — Receita gerada por cada médico no período, com comissão calculável.
- **Metas mensais** — Campo para definir meta de faturamento e barra de progresso no Dashboard.
- **Relatório de inadimplência** — Lista de quem deve, quanto, há quantos dias.
- **Comparativo mensal** — Gráfico de linha com receita dos últimos 6 meses.
- **Exportação de relatórios em PDF** — Além de Excel.

### Infraestrutura e SaaS

- **Realtime com Supabase** — Agendamentos, WhatsApp e leads atualizando em tempo real entre abas e usuários sem precisar clicar em "Atualizar".
- **Configurações da clínica** — Tela para editar nome, CNPJ, endereço, logo e horário de funcionamento.
- **Planos e assinaturas** — Preparar tabela `clinicas` para tiers (gratuito, básico, premium) para futura monetização.
- **Subdomínio por clínica** — `analise-saude.clinicpro.com.br` ao invés de `/agendar/slug`.
- **Notificações push reais** — Completar a estrutura já existente (`push_notifications`) para enviar alertas de novos agendamentos, mensagens WhatsApp e pagamentos.

---

## 14. Lista de Prioridades

### Prioridade Alta — Corrigir antes de usar em produção

1. **[SEGURANÇA]** Corrigir o fallback de role para mínimo privilégio (não "admin") em `AuthContext.tsx`.
2. **[SEGURANÇA]** Corrigir o nome da variável de API Key na Edge Function `deby-ai` (`OPENAI_API_KEY` → `OPENROUTER_API_KEY`) e o endpoint.
3. **[SEGURANÇA]** Verificar e remover `.env.local` do histórico git. Rotacionar todas as chaves expostas.
4. **[SEGURANÇA]** Restringir CORS nas Edge Functions para a origem real do app.
5. **[BUG]** Substituir gráfico estático do Dashboard por dados reais.
6. **[SEGURANÇA]** Verificar validação de assinatura HMAC no webhook WAHA.
7. **[BUG]** Remover o texto "Dados de demonstração" do Dashboard em modo produção.
8. **[SEGURANÇA]** Implementar rate limiting na Deby AI.

### Prioridade Média — Melhora significativa de uso e qualidade

9. Remover código morto: `src/components/admin/`, `AIPanel.tsx` sem rota.
10. Registrar rota do `ExportPage` em `App.tsx` ou removê-lo.
11. Implementar toast de sucesso/erro após salvar/excluir em todos os módulos.
12. Implementar Supabase Realtime para agendamentos e WhatsApp.
13. Adicionar paginação no `useClinicData` para pacientes e agendamentos.
14. Filtrar KPIs financeiros do Dashboard para o perfil do profissional.
15. Impedir que secretária edite preços de serviços.
16. Consolidar WAHA e Evolution API em uma única solução.
17. Refatorar `AppointmentsPanel` — separar formulário em sub-componente.
18. Implementar skeleton loaders padronizados.
19. Adicionar 2FA obrigatório para admin.

### Prioridade Baixa — Refinamento e crescimento

20. Painel de atendimento dedicado ao médico.
21. Lembrete automático de consulta por WhatsApp.
22. Confirmação de consulta com 1 clique.
23. DRE por profissional.
24. Metas mensais de faturamento.
25. Relatório de inadimplência por paciente.
26. Anamnese estruturada no prontuário.
27. Exportação de relatórios em PDF.
28. Campos de CNPJ, endereço e logo na tabela `clinicas`.
29. Log de auditoria de ações administrativas.
30. Preparação de estrutura de planos/assinaturas para SaaS.

---

## 15. Plano de Ação Recomendado

### Etapa 1 — Segurança e Permissões (Semana 1)

**Objetivo:** Fechar vulnerabilidades antes de qualquer uso com dados reais.

- Corrigir fallback de role em `AuthContext.tsx` (linha 146): `?? "secretaria"` ou redirecionar para login.
- Corrigir variável de API e endpoint na função `deby-ai`.
- Auditar `.env.local` no histórico git e rotacionar chaves expostas.
- Restringir `Access-Control-Allow-Origin` nas Edge Functions.
- Verificar implementação da assinatura HMAC no webhook WAHA.
- Implementar rate limiting básico na `deby-ai` (máx 20 chamadas/hora por usuário).
- Ativar 2FA no painel do Supabase Auth.

### Etapa 2 — Correções Críticas de Produto (Semana 2)

**Objetivo:** Fazer o sistema funcionar de forma confiável e sem dados falsos.

- Substituir gráfico estático do Dashboard por consulta real aos agendamentos dos últimos 7 dias.
- Remover texto "Dados de demonstração" de módulos em modo produção.
- Corrigir o campo duplo de agendamento (paciente selecionado vs. nome avulso): definir regra clara de qual prevalece.
- Registrar `ExportPage` em `App.tsx` ou removê-lo.
- Remover código morto: pasta `src/components/admin/` e `AIPanel.tsx`.
- Consolidar tabelas WAHA e Evolution API (escolher uma, remover a outra com migration).

### Etapa 3 — Melhorias de UX/UI (Semana 3-4)

**Objetivo:** Tornar o sistema agradável e profissional de usar.

- Implementar sistema de toast global (sucesso/erro em todas as ações).
- Padronizar skeleton loaders em todos os módulos.
- Refatorar `AppointmentsPanel` — formulário em sub-componente separado.
- Adicionar ícones Lucide na sidebar por módulo.
- Filtrar KPIs do Dashboard por perfil (profissional não vê financeiro).
- Impedir edição de preços pela secretária no módulo Serviços.
- Ajustar responsividade mobile nos módulos principais.

### Etapa 4 — Melhorias Operacionais (Semana 5-6)

**Objetivo:** Otimizar o fluxo diário de secretária, médico e admin.

- Implementar Supabase Realtime para agendamentos e WhatsApp.
- Adicionar paginação em `useClinicData` (pacientes e agendamentos).
- Criar painel de atendimento do médico (lista do dia, iniciar/concluir).
- Implementar confirmação de consulta com 1 clique + WhatsApp automático.
- Adicionar busca de paciente por número de telefone.
- Exibir histórico de fechamentos de caixa dos últimos 30 dias.
- Adicionar campos de CNPJ, endereço e telefone na clínica.

### Etapa 5 — Funcionalidades Inteligentes com IA (Semana 7-9)

**Objetivo:** Usar a Deby AI para automatizar tarefas repetitivas.

- Lembrete automático de consulta por WhatsApp (D-1 e D-0).
- Resposta automática fora do horário via WhatsApp.
- Sugestão automática de estrutura no prontuário ao digitar.
- Relatório diário automático para o admin no Dashboard.
- Anamnese estruturada com campos fixos no prontuário.
- Relatório de inadimplência com lista de pacientes devedores.
- DRE por profissional no módulo Financeiro.

### Etapa 6 — Preparação para SaaS (Semana 10+)

**Objetivo:** Transformar o sistema em um produto comercializável para múltiplas clínicas.

- Criar tela de configurações da clínica (nome, logo, CNPJ, horários).
- Adicionar campo `plan` em `clinicas` com tiers: `free`, `basic`, `premium`.
- Implementar limitações por plano (número de profissionais, storage, chamadas de IA).
- Criar página de onboarding para novas clínicas.
- Implementar subdomínio por clínica para agendamento público.
- Completar o fluxo de notificações push (estrutura já existe no banco).
- Documentar API interna e fluxos de dados.
- Adicionar log de auditoria de ações administrativas.
- Implementar prescrição médica com exportação PDF.

---

## 16. Conclusão

O **Análise Saúde System** tem uma base técnica sólida e uma visão de produto clara. O uso de Supabase com RLS, a integração de WhatsApp com IA operacional e a estrutura multi-perfil são pontos genuinamente fortes que poucos sistemas de gestão de clínicas para pequenas equipes têm.

Porém, o sistema **ainda não está pronto para uso em produção** com dados reais de pacientes pelos seguintes motivos objetivos:

1. **O gráfico do Dashboard exibe dados falsos** — um admin que toma decisões com base nele está sendo enganado pelo próprio sistema.
2. **Um bug crítico de segurança no frontend** pode exibir módulos administrativos para usuários sem permissão.
3. **A função de IA central (Deby AI) tem configuração inconsistente** de variável de ambiente que pode causar falha total em produção.
4. **Código morto significativo** (componentes duplicados, tabelas duplicadas de WhatsApp) aumenta o risco de confusão e manutenção futura.
5. **Sem testes automatizados** de nenhum tipo.

Com 2 semanas focadas nas Etapas 1 e 2 do plano de ação, o sistema pode atingir o nível mínimo para uso seguro com dados reais. Com 6-8 semanas completas das etapas 1 a 5, o produto estará no nível de um sistema profissional, confiável e com diferencial de IA que poucas clínicas de pequeno porte têm acesso.

O potencial é real. O que falta é disciplina de execução nas correções críticas antes de expandir funcionalidades.

---

*Auditoria gerada em 2026-05-21. Recomenda-se revisão trimestral conforme o sistema evolui.*
