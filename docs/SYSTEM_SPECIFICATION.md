# Especificação do Sistema: Análise Saúde — ClinicPro

> Versão atualizada em 2026-05-21. Cobre o estado real do produto em produção.

---

## 1. Identidade Visual (Design System)

### Mood & Estética
- **Conceito**: Clinical Modernism (Modernismo Clínico).
- **Vibe**: Precisão, confiança, limpeza e tecnologia.
- **Layout**: Espaços em branco generosos, cartões com bordas sutis, tipografia clara.

### Tipografia
- **Fonte principal**: `Outfit` (Google Fonts) — moderna, geométrica, legível.
- **Fonte monospace**: `JetBrains Mono` — usada em números de telefone e timestamps.
- Títulos: `font-bold tracking-tight text-ink`.
- Labels de seção: `text-[10px] uppercase font-bold tracking-widest text-ink-muted`.
- Corpo: `text-[13.5px] font-medium`.

### Paleta de Cores (tokens Tailwind em `tailwind.config.ts`)

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#15a898` | Teal vibrante — botões, destaques, ativo |
| `primary-dark` | `#0d8a7c` | Hover de botões primários |
| `primary-wash` | `#e8f7f6` | Fundo de itens selecionados / badges |
| `canvas` | `#f5f7f6` | Background da página |
| `surface` | `#ffffff` | Cards, inputs, painéis |
| `surface-low` | `#f0f2f1` | Hover states, áreas de menor hierarquia |
| `sidebar` | `#0f2320` | Cor escura da sidebar |
| `ink` | `#111b21` | Texto principal (quase preto) |
| `ink-secondary` | `#3b4a47` | Texto secundário |
| `ink-muted` | `#667781` | Texto de baixa hierarquia, placeholders |
| `border` | `rgba(21,168,152,0.15)` | Bordas sutis com tint primário |
| `border-strong` | `rgba(21,168,152,0.25)` | Bordas de inputs e cards |
| `border-divider` | `rgba(0,0,0,0.06)` | Divisores internos |
| `success` | `#22c55e` | Status positivo |
| `warning` | `#f59e0b` | Status de atenção |
| `danger` | `#ef4444` | Status crítico / erro |

### Animações (definidas no `tailwind.config.ts`)
- `animate-fade-in`: fadeIn 200ms ease-out — entrada de modais e mensagens.
- `animate-shimmer`: shimmer 1.4s infinite — skeleton loading.
- `animate-slide-in-right`: slideInRight 280ms cubic-bezier(0.34, 1.56, 0.64, 1) — drawers laterais.

### Sombras
- `shadow-card`: sombra sutil para cards normais.
- `shadow-modal`: sombra mais pronunciada para modais e drawers.

### Border Radius
- `rounded-xl` (12px) para a maioria dos cards e modais.
- `rounded-2xl` (16px) para balões de mensagem.
- `rounded-full` para avatares e badges.

---

## 2. Arquitetura & Stack

### Frontend
| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Estilização | Tailwind CSS v3 com tema customizado |
| Ícones | `lucide-react` |
| Roteamento | React Router DOM |
| Estado | React state (sem Redux) |

### Backend (Supabase)
| Camada | Tecnologia |
|---|---|
| Banco de dados | PostgreSQL (Supabase) |
| Auth | Supabase Auth (email/senha) |
| Segurança | Row Level Security (RLS) em todas as tabelas |
| Realtime | `postgres_changes` para inbox de WhatsApp |
| Edge Functions | Deno (TypeScript) — `quick-action` e `evolution-webhook` |
| Storage | Supabase Storage — bucket `whatsapp-media` para mídias |

### Integrações Externas
- **Evolution API v2** (WhatsApp via Baileys): NUNCA chamada diretamente do frontend. Sempre via Edge Function `quick-action`.
- **Deby AI**: Assistente de IA para sugestões de resposta e resumo de conversas.

---

## 3. Módulos do Sistema

### 3.1 Dashboard
KPIs da clínica: total de pacientes, agendamentos do mês, receita, inadimplência. Motor de Crescimento IA que gera análise de oportunidades e sugestões de copy para WhatsApp.

### 3.2 Profissionais
CRUD de profissionais com especialidade, CRM, comissão e foto. Vinculados a agendamentos.

### 3.3 Serviços
CRUD de serviços com preço e duração. Usados em agendamentos e pacotes.

### 3.4 Agendamentos
Calendário semanal com cards coloridos por status. CRUD de agendamentos com profissional, serviço, paciente e horário.

### 3.5 Pacientes
Lista e cadastro de pacientes. Botão direto para iniciar conversa no WhatsApp. Acesso ao prontuário (com receita digital para médicos).

### 3.6 Leads (Kanban)
Kanban de leads com colunas por etapa, temperatura (quente/morno/frio), notas e integração com WhatsApp.

### 3.7 WhatsApp (módulo principal)

Layout de 3 colunas (sidebar conversas/contatos | chat | painel contato+IA):

**Sidebar esquerda:**
- Aba "Conversas" com filtros: Todos / Leads / IA / Não lidos
- Aba "Contatos" com busca e botão "Novo contato"
- Indicador de conexão com a instância Evolution API

**Chat central:**
- Header clicável (foto do contato abre drawer de informações no mobile)
- Balões de mensagem estilo WhatsApp Business (verde para enviadas, branco para recebidas)
- Suporte a: texto, imagem, vídeo, áudio (player com waveform), documento, figurinha
- Links clicáveis (função `linkify`)
- Envio de arquivos (imagem, vídeo, áudio, PDF)

**Painel direito (xl+) / Drawer (mobile):**
- Avatar, nome e telefone do contato
- Badge e seletor de status de atendimento: novo / lead ativo / paciente / arquivado / atendimento humano
- CRM: converter em lead, converter em paciente, criar agendamento
- Deby AI: toggle de IA automática, modo (automático/assistido), sumarizar conversa, sugerir resposta

**Conexão WhatsApp:**
- Gerenciamento de instâncias (criar, conectar via QR, desconectar, deletar)
- Webhook configurado automaticamente no Supabase para salvar mensagens
- Contatos sincronizados via evento `CONTACTS_UPSERT` da Evolution API

### 3.8 Caixa, Financeiro, Pacotes, Relatórios, Acessos
Módulos completos de gestão financeira, pacotes de sessões, relatórios com gráficos e controle de acesso por role.

---

## 4. Controle de Acesso (Roles)

| Role | Módulos visíveis |
|---|---|
| `admin` | Todos |
| `secretaria` | Dashboard, Agendamentos, Pacientes, Leads, WhatsApp, Kanban, Caixa, Serviços, Pacotes |
| `profissional` | Dashboard, Agendamentos, Pacientes, Kanban |

---

## 5. Banco de Dados — Tabelas Principais

### Autenticação & Clínica
- `clinicas` — dados da clínica (nome, logo, etc.)
- `perfis` — vincula `auth.users` à clínica com role

### WhatsApp
- `whatsapp_instancias` — instâncias Evolution API por clínica
- `whatsapp_contatos` — contatos com `push_name`, `profile_pic_url`, `origem`
- `whatsapp_conversas` — conversas com `ultimo_texto`, `unread_count`, `atendimento_status`, `ai_enabled`
- `whatsapp_mensagens` — mensagens com `direcao (in/out)`, `tipo`, `texto`, `media_url`, `waha_message_id` (deduplicação)
- `whatsapp_ai_agents` — configuração do agente Deby AI por clínica

### Clínica
- `profissionais`, `servicos`, `agendamentos`, `pacientes`, `leads`, `lead_stages`
- `finance_entries`, `packages`, `package_sessions`

---

## 6. Edge Functions (Supabase)

### `quick-action` (sem verificação JWT)
Proxy para a Evolution API. Actions disponíveis:
`fetch_instances`, `create_instance`, `connect_instance`, `get_status`, `logout_instance`, `delete_instance`, `set_webhook`, `send_text`, `send_media`, `fetch_profile_picture`, `fetch_contacts`

### `evolution-webhook` (sem verificação JWT)
Recebe eventos da Evolution API via `?clinicId=<uuid>`.
- `MESSAGES_UPSERT` → salva mensagem, faz upload de mídia no Storage, deduplica por `waha_message_id`
- `CONTACTS_UPSERT` → upsert em `whatsapp_contatos` com nome e foto

---

## 7. Padrões de Código

- Serviços no frontend: `src/services/` — nunca chame APIs externas diretamente, sempre via Edge Function.
- `callQuickAction()` retorna `envelope.data` (resposta da Evolution API), não o envelope inteiro.
- `sessionStorage` persiste o módulo ativo entre navegações.
- Componentes isolados por responsabilidade: `MessageBubble`, `AudioBubble`, `MediaPreview`, `ContactAiPanel`, `Avatar`.
- Sem Redux, sem context global além do `AuthContext`.

---

## 8. Estrutura de Arquivos Relevante

```
src/
  pages/admin/
    AdminPage.tsx           — shell principal, persiste activeModule no sessionStorage
    modules/
      WhatsAppPanel.tsx     — painel WhatsApp completo (inbox + contatos + IA)
      DashboardPanel.tsx    — KPIs + Growth Engine IA
      PatientsPanel.tsx     — lista + prontuário + receita digital
      LeadKanbanPanel.tsx   — kanban de leads
      ... (demais módulos)
  services/
    evolutionService.ts     — CRUD Supabase para WhatsApp
    quickActionService.ts   — chamadas à Edge Function quick-action
    debyService.ts          — integração com Deby AI
    leadService.ts, patientService.ts, ...
  components/layout/
    AdminShell.tsx          — sidebar + layout responsivo
supabase/
  functions/
    quick-action/index.ts   — proxy Evolution API
    evolution-webhook/index.ts — receptor de eventos WhatsApp
```
