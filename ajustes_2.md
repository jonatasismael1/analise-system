\# PLANO DE IMPLEMENTAÇÃO | CLINIC PRO

Você vai atuar como arquiteto sênior React \+ TypeScript \+ Supabase.

Objetivo:  
Corrigir a estrutura, confiabilidade, português, UX e prontidão comercial do Clinic Pro sem quebrar o que já funciona.

Regra principal:  
Não reescreva o projeto inteiro. Faça refatoração progressiva, segura e testável.

\---

\#\# 1\. Auditoria inicial obrigatória

Antes de alterar qualquer arquivo:

1\. Rode:  
   \- npm install  
   \- npm run build  
   \- npm run dev, se possível

2\. Mapeie:  
   \- estrutura de pastas  
   \- rotas existentes  
   \- componentes grandes demais  
   \- chamadas Supabase  
   \- textos sem acento  
   \- pontos com mock data  
   \- erros TypeScript  
   \- warnings visuais/mobile

3\. Gere uma lista curta de problemas encontrados antes de começar a corrigir.

\---

\#\# 2\. Refatorar AdminPage.tsx

Problema:  
AdminPage.tsx está grande demais e concentra muitos módulos.

Meta:  
Quebrar em arquivos menores sem mudar comportamento.

Criar estrutura:

src/pages/admin/  
  AdminPage.tsx  
  modules/  
    DashboardPanel.tsx  
    ProfessionalsPanel.tsx  
    ServicesPanel.tsx  
    AppointmentsPanel.tsx  
    PatientsPanel.tsx  
    PatientKanbanPanel.tsx  
    FinancePanel.tsx  
    PackagesPanel.tsx  
    ReportsPanel.tsx  
    AIPanel.tsx  
    AccessPanel.tsx  
  components/  
    Field.tsx  
    StatusPill.tsx  
    DataMessage.tsx  
    RefinedTable.tsx  
    WeeklyCalendar.tsx

Regras:  
\- Não alterar regras de negócio.  
\- Não alterar nomes de props sem necessidade.  
\- Manter todos os módulos funcionando.  
\- Remover duplicações óbvias.  
\- Manter imports limpos.  
\- Build precisa passar ao final.

\---

\#\# 3\. Remover mock data do ambiente real

Problema:  
O sistema usa dados fake como fallback quando Supabase falha.

Meta:  
Separar claramente ambiente real e ambiente demo.

Implementar:

1\. Criar variável:  
VITE\_APP\_MODE=production | demo

2\. Se VITE\_APP\_MODE \=== "demo":  
   \- permitir mockData  
   \- mostrar badge visível: "Modo demonstração"

3\. Se VITE\_APP\_MODE \=== "production":  
   \- nunca renderizar mockData  
   \- se Supabase falhar, mostrar erro real e botão "Tentar novamente"  
   \- não misturar dados fictícios com dados reais

4\. Ajustar:  
   \- useClinicData.ts  
   \- BookingPage.tsx  
   \- qualquer outro ponto que importe mockData

Mensagem padrão:  
"Não foi possível carregar os dados da clínica. Verifique sua conexão ou tente novamente."

\---

\#\# 4\. Corrigir português e microcopy

Revisar todos os textos visíveis ao usuário.

Corrigir:  
\- clinica → clínica  
\- servico → serviço  
\- horario → horário  
\- confirmara → confirmará  
\- Sessao → Sessão  
\- Precisao Clinica → Precisão Clínica  
\- Sistemas de Precisao Clinica → Sistema de Precisão Clínica  
\- Nao foi possivel → Não foi possível  
\- validos → válidos  
\- Email → E-mail

Tom desejado:  
\- profissional  
\- claro  
\- confiável  
\- sem linguagem exagerada  
\- sem termos técnicos para secretária

\---

\#\# 5\. Melhorar calendário de agendamentos

Problema:  
Agenda é o coração do SaaS, mas hoje parece secundária.

Meta:  
Transformar o calendário no principal painel operacional da clínica.

Implementar melhorias:

1\. Criar componente:  
src/pages/admin/components/ClinicCalendar.tsx

2\. Recursos:  
\- visão semanal horizontal  
\- colunas por dia  
\- cards de agendamento dentro do dia  
\- status visual: pendente, confirmado, concluído, faltou, cancelado  
\- filtro por profissional  
\- filtro por status  
\- filtro por data  
\- botão "Hoje"  
\- botão "Próxima semana"  
\- botão "Semana anterior"  
\- estado vazio elegante

3\. Mobile:  
\- usar cards empilhados por dia  
\- evitar tabela espremida  
\- cada agendamento deve mostrar:  
  \- horário  
  \- paciente  
  \- profissional  
  \- serviço  
  \- status

4\. Não remover a tabela atual até garantir que o calendário novo funcione.  
Pode deixar tabela como "Lista de agendamentos".

\---

\#\# 6\. Melhorar Kanban de pacientes

Meta:  
Kanban horizontal no desktop e usável no mobile.

Regras:  
\- Desktop: colunas lado a lado com scroll horizontal se necessário.  
\- Mobile: cards por etapa, empilhados ou com scroll horizontal suave.  
\- Cada paciente deve mostrar:  
  \- nome  
  \- WhatsApp  
  \- profissional vinculado  
  \- próximo retorno  
  \- valor total gasto  
  \- observação resumida  
\- Permitir mudar etapa, se já existir lógica no projeto.  
\- Não inventar drag and drop se não existir estrutura segura. Primeiro usar select/botões.

\---

\#\# 7\. Bloquear cadastro público em produção

Problema:  
LoginPage permite registrar clínica direto.

Meta:  
Em produção, o cadastro deve ser controlado.

Implementar:

1\. Criar variável:  
VITE\_ALLOW\_PUBLIC\_SIGNUP=true | false

2\. Se false:  
\- esconder botão "Não tem conta? Registre sua clínica"  
\- não renderizar formulário de cadastro  
\- mostrar texto discreto:  
  "Acesso exclusivo para clínicas cadastradas."

3\. Se true:  
\- manter cadastro funcionando

4\. Evitar quebrar registerClinic.

\---

\#\# 8\. Criar README profissional

Criar README.md com:

\# Clinic Pro

Descrição:  
Sistema SaaS para clínicas acompanharem agenda, pacientes, financeiro, pacotes, acessos e oportunidades de crescimento em um único painel.

Seções:  
\- Visão geral  
\- Stack  
\- Funcionalidades  
\- Estrutura de pastas  
\- Variáveis de ambiente  
\- Como rodar localmente  
\- Modo demo vs produção  
\- Integração Supabase  
\- Roadmap  
\- Cuidados de segurança

Incluir variáveis:  
VITE\_SUPABASE\_URL=  
VITE\_SUPABASE\_ANON\_KEY=  
VITE\_APP\_MODE=production  
VITE\_ALLOW\_PUBLIC\_SIGNUP=false

\---

\#\# 9\. Criar .env.example

Criar arquivo:

.env.example

Com:

VITE\_SUPABASE\_URL=  
VITE\_SUPABASE\_ANON\_KEY=  
VITE\_APP\_MODE=production  
VITE\_ALLOW\_PUBLIC\_SIGNUP=false

Nunca colocar chaves reais.

\---

\#\# 10\. Melhorar UX geral sem redesenhar tudo

Aplicar melhorias leves:

\- padronizar botões  
\- padronizar inputs  
\- melhorar espaçamento  
\- reduzir poluição visual  
\- melhorar estados vazios  
\- melhorar mensagens de erro/sucesso  
\- deixar mobile mais limpo  
\- evitar sidebar esmagando conteúdo  
\- manter verde/branco como base  
\- adicionar aparência mais SaaS premium sem exagerar

Não usar glassmorphism pesado.  
Não mudar identidade visual inteira.

\---

\#\# 11\. Segurança e confiabilidade

Verificar:

\- nenhuma chave secreta hardcoded  
\- Supabase anon key apenas via env  
\- erros tratados sem expor stack técnica para usuário comum  
\- ações destrutivas com confirmação:  
  \- excluir profissional  
  \- excluir serviço  
  \- excluir paciente  
  \- excluir agendamento  
  \- excluir pagamento  
  \- excluir despesa  
  \- excluir usuário

Criar função utilitária se fizer sentido:  
confirmDangerAction(message)

\---

\#\# 12\. Build final obrigatório

Ao final:

1\. Rodar:  
npm run build

2\. Corrigir todos os erros TypeScript.

3\. Entregar resumo com:  
\- arquivos alterados  
\- principais melhorias  
\- problemas corrigidos  
\- pontos que ainda precisam backend/Supabase  
\- riscos restantes

\---

\#\# Prioridade de execução

Ordem obrigatória:

1\. Build inicial  
2\. Refatoração do AdminPage  
3\. Separação demo/produção  
4\. Correção de português  
5\. Calendário  
6\. Kanban  
7\. Bloqueio de cadastro público  
8\. README e .env.example  
9\. Melhorias UX  
10\. Segurança  
11\. Build final

\---

\#\# Critério de aceite

A implementação só está concluída se:

\- npm run build passa  
\- login continua funcionando  
\- admin continua acessível  
\- módulos continuam renderizando  
\- mock data não aparece em produção  
\- cadastro público pode ser bloqueado via env  
\- calendário fica mais usável  
\- kanban fica horizontal no desktop  
\- português visível está corrigido  
\- README.md existe  
\- .env.example existe  
