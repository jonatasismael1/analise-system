# Design System: Análise Saúde System

## 1. Visual Theme & Atmosphere

**"Precisão Clínica com Identidade Própria"**

Uma interface que opera entre o rigor de um sistema hospitalar premium e a legibilidade de um editorial de dados de saúde. A densidade é equilibrada — informação suficiente sem sufocamento. Layouts assimétricos ancorados por um sidebar escuro conferem profundidade e estrutura institucional. O teal vibrante do logo é o fio condutor visual entre marca e produto: aparece em CTAs, estados ativos, focus rings e bordas de ênfase. O vermelho coral do logo é preservado com autoridade — nunca decorativo, sempre sinalizando criticidade real.

- **Densidade:** 6/10 — operacional e informativo, mas com respiro intencional
- **Variância:** 5/10 — assimetria estruturada (sidebar escuro + conteúdo claro), sem caos
- **Movimento:** 4/10 — micro-interações funcionais, sem performance cinematográfica
- **Atmosfera:** Consultório de alto padrão que também é sala de controle. Confiável. Objetivo. Não genérico.

---

## 2. Palette de Cores & Funções

### Superfícies
| Token | Hex | Função |
|---|---|---|
| `--color-canvas` | `#F3F6F5` | Background da aplicação — sage-branco, toque de verde-frio |
| `--color-surface` | `#FFFFFF` | Cards, modais, dropdowns — superfície mais elevada |
| `--color-surface-low` | `#EDF1F0` | Cabeçalhos de tabela, áreas recuadas, fundo de inputs |
| `--color-sidebar` | `#192827` | Sidebar — teal-charcoal profundo, âncora da identidade visual |
| `--color-sidebar-hover` | `#243D3B` | Item de menu hover no sidebar |

### Tipografia & Estrutura
| Token | Hex | Função |
|---|---|---|
| `--color-ink` | `#1A2B2A` | Texto primário — quase-preto com toque teal, nunca puro `#000` |
| `--color-ink-secondary` | `#4E6A68` | Texto secundário, labels, metadados |
| `--color-ink-muted` | `#7A9490` | Placeholders, textos desabilitados, captions |
| `--color-border` | `rgba(21, 168, 152, 0.12)` | Bordas de cards — whisper teal |
| `--color-border-strong` | `#C4D4D1` | Bordas de inputs em repouso |
| `--color-divider` | `#EDF1F0` | Linhas divisórias entre rows de tabela |

### Acento Único — Teal da Marca
| Token | Hex | Função |
|---|---|---|
| `--color-primary` | `#15A898` | CTA primário, estados ativos, focus rings, links |
| `--color-primary-dark` | `#0D7A6D` | Hover de CTA primário, texto em superfície clara |
| `--color-primary-wash` | `#E4F5F3` | Background hover de itens, badges neutros ativos |
| `--color-primary-sidebar` | `#1DC9B5` | Acento ativo no sidebar (mais brilhante sobre fundo escuro) |

### Estados Semânticos
| Token | Hex | Função |
|---|---|---|
| `--color-danger` | `#C84A3C` | Vermelho coral do logo — erros, ações destrutivas, crítico |
| `--color-danger-wash` | `#FEF0EE` | Background de badges e alertas de erro |
| `--color-danger-border` | `#F5C4BE` | Borda de inputs em estado de erro |
| `--color-success` | `#2B7A50` | Confirmações, agendamentos concluídos |
| `--color-success-wash` | `#E6F4EC` | Background de badges de sucesso |
| `--color-warning` | `#B8710F` | Avisos, atenção, pendências |
| `--color-warning-wash` | `#FEF5E4` | Background de badges de aviso |

> **Regra de saturação:** O acento teal `#15A898` é o único cor de alta saturação em toda a UI. Vermelho coral é reservado exclusivamente para estados críticos/destrutivos — nunca usado decorativamente.

---

## 3. Arquitetura Tipográfica

### Família Principal: **Outfit** (substitui Inter — banido)
Humanista geométrica com personalidade própria. Legível em todos os tamanhos, carrega autoridade sem frieza. Disponível via Google Fonts.

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

### Família Mono: **JetBrains Mono**
Para valores financeiros, timestamps, IDs de prontuário, dados tabulares. Uso obrigatório em qualquer número que precise de alinhamento colunar.

### Escala Tipográfica

| Uso | Fonte | Peso | Tamanho | Tracking | Cor |
|---|---|---|---|---|---|
| Título de página | Outfit | 700 | 20px | -0.025em | `--color-ink` |
| Título de seção | Outfit | 600 | 15px | -0.015em | `--color-ink` |
| Label de cabeçalho de tabela | Outfit | 600 | 10px | +0.08em | `--color-ink-secondary` (uppercase) |
| Corpo / parágrafo | Outfit | 400 | 14px | 0 | `--color-ink` |
| Metadado / caption | Outfit | 400 | 12px | 0 | `--color-ink-secondary` |
| Placeholder | Outfit | 400 | 14px | 0 | `--color-ink-muted` |
| Valores monetários | JetBrains Mono | 500 | 14px | 0 | `--color-ink` |
| IDs / timestamps | JetBrains Mono | 400 | 12px | 0 | `--color-ink-secondary` |
| KPI Dashboard (número grande) | JetBrains Mono | 700 | 28px | -0.02em | `--color-ink` |

### Regras inegociáveis
- Inter: **BANIDO** — toda ocorrência deve ser substituída por Outfit
- Hierarquia via **peso e cor**, não via tamanho gritante
- Linha máxima de corpo: `65ch` em textos corridos
- `font-feature-settings: "tnum"` obrigatório em todos os valores numéricos financeiros

---

## 4. Estilização de Componentes

### Button

```css
/* Estrutura base */
height: 36px;                        /* h-9 — mais compacto que h-10 atual */
padding: 0 14px;                     /* px-3.5 */
border-radius: 8px;                  /* rounded-lg */
font: 500 13px/1 'Outfit';
transition: all 150ms ease-out;
```

**Primary** — Fundo teal sólido, sem brilho externo
```
background: #15A898;  color: #fff;
hover → background: #0D7A6D;
active → translateY(-1px) + shadow: 0 3px 8px rgba(21,168,152,0.25);
focus-visible → ring 2px offset-2 #15A898;
```

**Secondary** — Outline limpo
```
background: #fff;  border: 1px solid #C4D4D1;  color: #0D7A6D;
hover → background: #E4F5F3;  border-color: #15A898;
active → translateY(-1px);
```

**Danger** — Vermelho contido, não agressivo
```
background: #FEF0EE;  border: 1px solid #F5C4BE;  color: #C84A3C;
hover → background: #FDE4E1;  border-color: #EDA49D;
```

**Ghost** — Mínimo
```
background: transparent;  color: #4E6A68;
hover → background: #EDF1F0;
```

> Proibido: glow externo neon, cursor customizado, gradientes em botões.

---

### Input / Campo de Formulário

```css
height: 38px;
padding: 0 12px;
border: 1px solid #C4D4D1;           /* borda em repouso */
border-radius: 8px;
background: #fff;
font: 400 14px 'Outfit';
color: #1A2B2A;
transition: border 150ms ease-out, box-shadow 150ms ease-out;
```

```
focus → border: 1px solid #15A898;
         box-shadow: 0 0 0 3px rgba(21, 168, 152, 0.15);
error → border: 1px solid #C84A3C;
         box-shadow: 0 0 0 3px rgba(200, 74, 60, 0.12);
```

- **Label:** sempre acima, nunca flutuante. `Outfit 500 12px`, `#1A2B2A`, margin-bottom `6px`
- **Texto de erro:** abaixo do campo, `Outfit 400 12px`, `#C84A3C`, com ícone de alerta 14px
- **Placeholder:** `#7A9490` — nunca serve como substituto de label

---

### Badge / StatusPill

Tamanho fixo: `height: 22px`, `padding: 0 8px`, `border-radius: 999px`, `font: 600 11px Outfit`

| Estado | Background | Texto | Uso |
|---|---|---|---|
| Agendado | `#E4F5F3` | `#0D7A6D` | Consultas futuras confirmadas |
| Concluído | `#E6F4EC` | `#2B7A50` | Atendimentos finalizados |
| Cancelado | `#FEF0EE` | `#C84A3C` | Cancelamentos |
| Aguardando | `#FEF5E4` | `#B8710F` | Pendente de confirmação |
| Inativo | `#F0F2F1` | `#7A9490` | Pacientes/registros inativos |

---

### Tabela (RefinedTable)

```
Container → border: 1px solid rgba(21,168,152,0.12);  border-radius: 10px;  overflow: hidden;

Header row → background: #EDF1F0;
  th → Outfit 600 10px UPPERCASE tracking-widest #4E6A68;
       padding: 10px 16px;

Body row → background: #fff;
           border-bottom: 1px solid #EDF1F0;
  hover → background: #F7FAFB;
           transition: background 120ms ease-out;

td → Outfit 400 13.5px #1A2B2A;
     padding: 11px 16px;

td [número/valor] → JetBrains Mono 500 13.5px;  text-align: right;
```

---

### Modal

```
Backdrop → background: rgba(25, 40, 39, 0.55);  backdrop-filter: blur(4px);
Container → background: #fff;  border-radius: 14px;
             box-shadow: 0 20px 60px rgba(25, 40, 39, 0.22);
             max-width: 520px;  width: 100%;  padding: 0;

Header → padding: 20px 24px 16px;
          border-bottom: 1px solid #EDF1F0;
          Outfit 600 16px #1A2B2A;

Body → padding: 20px 24px;

Footer → padding: 16px 24px 20px;
          border-top: 1px solid #EDF1F0;
          display: flex;  justify-content: flex-end;  gap: 8px;
```

---

### Toast / Notificação

Design "pill escura" — contrasta com toda interface, não some no branco.

```
background: #1A2B2A;             /* sidebar color — coerência visual */
border-left: 3px solid [cor-de-estado];
border-radius: 10px;
padding: 12px 16px;
color: #fff;
font: 500 13.5px 'Outfit';
box-shadow: 0 8px 24px rgba(25, 40, 39, 0.28);
max-width: 360px;
```

| Tipo | Borda esquerda |
|---|---|
| Sucesso | `#1DC9B5` (teal brilhante) |
| Erro | `#C84A3C` |
| Aviso | `#E8930A` |
| Info | `#4A8FBB` |

---

### Tabs

```
Container → border-bottom: 2px solid #EDF1F0;

Tab item:
  inactive → Outfit 500 13.5px #4E6A68;  padding: 10px 0;  margin-right: 24px;
              border-bottom: 2px solid transparent;  transition: all 150ms ease;
  hover → color: #0D7A6D;
  active → color: #15A898;  border-bottom: 2px solid #15A898;
```

---

### Skeleton Loader

Correspondência exata com o layout que carrega. Proibido spinner circular genérico.

```css
background: linear-gradient(90deg, #EDF1F0 25%, #F3F6F5 50%, #EDF1F0 75%);
background-size: 200% 100%;
animation: shimmer 1.4s ease-in-out infinite;
border-radius: 6px;

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

### Empty State

Nunca apenas texto "Sem dados". Composição intencional:

```
Container → display: flex; flex-direction: column; align-items: center;
             gap: 12px;  padding: 48px 24px;

Ícone → Material Symbols Outlined, 40px, #7A9490 (outline stroke, não preenchido)
Título → Outfit 600 15px #1A2B2A
Subtítulo → Outfit 400 13.5px #4E6A68;  max-width: 280px;  text-align: center;
CTA → Button variant secondary (quando aplicável)
```

---

## 5. Sidebar — Anatomia Completa

O sidebar é o elemento de maior identidade visual. Fundo `#192827` cria separação imediata entre navegação e conteúdo.

```
Width: 240px (desktop)  → 0 (mobile, drawer overlay)
Background: #192827
Border-right: none (sombra substitui linha)
Box-shadow: 2px 0 12px rgba(0,0,0,0.15)

Logo area:
  height: 56px;  padding: 0 20px;  display: flex; align-items: center; gap: 10px;
  img → height: 28px;
  Sistema name → Outfit 600 13px #E4F5F3 (não branco puro)

Nav section label:
  Outfit 500 9.5px UPPERCASE tracking-widest #7A9490;
  padding: 20px 20px 6px;

Nav item (inativo):
  height: 40px;  padding: 0 12px 0 20px;  border-radius: 0 8px 8px 0;
  display: flex; align-items: center; gap: 10px;
  icon → Material Symbols 20px #8AA5A0;
  label → Outfit 500 13.5px #8AA5A0;
  transition: all 150ms ease-out;

Nav item (hover):
  background: #243D3B;
  icon + label → color: #C8E8E4;

Nav item (ativo):
  background: rgba(29, 201, 181, 0.12);
  border-left: 3px solid #1DC9B5;   /* teal brilhante sobre escuro */
  padding-left: 17px;               /* compensa a borda */
  icon → color: #1DC9B5;
  label → color: #E4F5F3;  font-weight: 600;

Área de perfil (rodapé):
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 12px 16px;
  Avatar 32px circular + nome + role em Outfit 400 12px #8AA5A0;
```

---

## 6. Princípios de Layout

### Grid e Contenção

```css
/* Contenção máxima de conteúdo */
.layout-root {
  display: grid;
  grid-template-columns: 240px 1fr;   /* sidebar fixo + conteúdo fluido */
  min-height: 100dvh;                 /* nunca h-screen — bug iOS Safari */
}

/* Área de conteúdo principal */
.content-area {
  background: #F3F6F5;
  padding: 24px 28px;
  overflow-y: auto;
}

/* Container de página */
.page-container {
  max-width: 1300px;
  width: 100%;
}
```

### Espaçamento (tokens em px → rem)

| Token | px | rem | Uso |
|---|---|---|---|
| `space-1` | 4px | 0.25rem | Micro — gap entre ícone e texto |
| `space-2` | 8px | 0.5rem | Interno — padding de badges |
| `space-3` | 12px | 0.75rem | Padrão — gap de formulários |
| `space-4` | 16px | 1rem | Standard padding de cards |
| `space-6` | 24px | 1.5rem | Padding de página, gap de seções |
| `space-7` | 28px | 1.75rem | Padding lateral de conteúdo |
| `space-8` | 32px | 2rem | Gap entre seções maiores |

### Border Radius

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 6px | Badges, chips menores |
| `radius-md` | 8px | Botões, inputs, tags |
| `radius-lg` | 12px | Cards, seções, modais |
| `radius-xl` | 14px | Modais grandes, drawers |

### Regras de Composição

- **CSS Grid sobre Flexbox percentual** — sem `calc()` hacks
- **Nenhum elemento sobreposto** — cada elemento ocupa sua própria zona espacial
- Grid de features proibido: "3 cards iguais em linha" → usar zig-zag assimétrico (2+1 ou 1+2) ou scroll horizontal
- KPIs de dashboard: grid `2-col` ou `3-col` máximo, nunca 4 iguais

---

## 7. Responsividade

### Breakpoints

| Nome | Viewport | Comportamento |
|---|---|---|
| Mobile | < 768px | Sidebar vira drawer overlay; layout colapsa para coluna única |
| Tablet | 768px–1024px | Sidebar pode ser collapsível (só ícones) |
| Desktop | ≥ 1024px | Layout completo sidebar + conteúdo |

### Regras Mobile

```css
/* Sidebar vira overlay */
@media (max-width: 767px) {
  .layout-root { grid-template-columns: 1fr; }
  .sidebar { position: fixed; z-index: 50; transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
}

/* Tipografia via clamp */
.page-title { font-size: clamp(16px, 4vw, 20px); }
.section-title { font-size: clamp(13px, 3vw, 15px); }

/* Touch targets mínimos */
button, a, [role="button"] { min-height: 44px; }

/* Sem overflow horizontal */
* { max-width: 100%; }
table { min-width: 600px; } /* tabela com scroll horizontal em container */
```

---

## 8. Filosofia de Movimento

### Spring Physics

```
stiffness: 120  |  damping: 22  |  mass: 1
→ Resultado: snappy com peso, não borrachudo. Premium sem exagero.
```

### Micro-interações Obrigatórias

| Elemento | Comportamento |
|---|---|
| Nav item sidebar | Scale 1→1.02 no hover + color transition 150ms |
| Botão primário | translateY -1px + shadow no active |
| Badge de status | Fade-in 200ms ao renderizar |
| Row de tabela | Background transition 120ms no hover |
| Modal | Fade + scale 0.96→1 em 200ms; backdrop fade 200ms |
| Toast | Slide-in da direita 280ms spring; auto-dismiss com shrink 300ms |

### Stagger de Listas

```css
/* Cards e linhas de tabela */
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 30ms; }
.list-item:nth-child(3) { animation-delay: 60ms; }
/* máx: 5 items com delay, resto sem */
```

### Performance

```
✓ Animar apenas: transform, opacity
✗ NUNCA animar: top, left, width, height, background
✓ will-change: transform (somente em elementos que realmente animam)
✓ Skeleton loader: shimmer via background-position (GPU)
```

---

## 9. Tokens CSS — Implementação

Aplicar em `src/styles/global.css`:

```css
:root {
  /* Superfícies */
  --color-canvas: #F3F6F5;
  --color-surface: #FFFFFF;
  --color-surface-low: #EDF1F0;
  --color-sidebar: #192827;
  --color-sidebar-hover: #243D3B;

  /* Tipografia */
  --color-ink: #1A2B2A;
  --color-ink-secondary: #4E6A68;
  --color-ink-muted: #7A9490;

  /* Bordas */
  --color-border: rgba(21, 168, 152, 0.12);
  --color-border-strong: #C4D4D1;
  --color-divider: #EDF1F0;

  /* Acento único — teal */
  --color-primary: #15A898;
  --color-primary-dark: #0D7A6D;
  --color-primary-wash: #E4F5F3;
  --color-primary-sidebar: #1DC9B5;

  /* Estados semânticos */
  --color-danger: #C84A3C;
  --color-danger-wash: #FEF0EE;
  --color-danger-border: #F5C4BE;
  --color-success: #2B7A50;
  --color-success-wash: #E6F4EC;
  --color-warning: #B8710F;
  --color-warning-wash: #FEF5E4;

  /* Raios */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 14px;

  /* Sombras */
  --shadow-card: 0 1px 4px rgba(25, 40, 39, 0.06);
  --shadow-modal: 0 20px 60px rgba(25, 40, 39, 0.22);
  --shadow-sidebar: 2px 0 12px rgba(0, 0, 0, 0.15);
  --shadow-toast: 0 8px 24px rgba(25, 40, 39, 0.28);
}
```

---

## 10. Atualização do Tailwind Config

```typescript
// tailwind.config.ts — substitui completamente o atual
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F3F6F5",
        surface: {
          DEFAULT: "#FFFFFF",
          low: "#EDF1F0",
        },
        sidebar: "#192827",
        ink: {
          DEFAULT: "#1A2B2A",
          secondary: "#4E6A68",
          muted: "#7A9490",
        },
        primary: {
          DEFAULT: "#15A898",
          dark: "#0D7A6D",
          wash: "#E4F5F3",
          bright: "#1DC9B5",   // para uso sobre fundo escuro (sidebar)
        },
        danger: {
          DEFAULT: "#C84A3C",
          wash: "#FEF0EE",
          border: "#F5C4BE",
        },
        success: {
          DEFAULT: "#2B7A50",
          wash: "#E6F4EC",
        },
        warning: {
          DEFAULT: "#B8710F",
          wash: "#FEF5E4",
        },
        border: {
          DEFAULT: "rgba(21, 168, 152, 0.12)",
          strong: "#C4D4D1",
          divider: "#EDF1F0",
        },
      },
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "14px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(25, 40, 39, 0.06)",
        modal: "0 20px 60px rgba(25, 40, 39, 0.22)",
        sidebar: "2px 0 12px rgba(0, 0, 0, 0.15)",
        toast: "0 8px 24px rgba(25, 40, 39, 0.28)",
        "primary-press": "0 3px 8px rgba(21, 168, 152, 0.25)",
      },
      animation: {
        shimmer: "shimmer 1.4s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
}
```

---

## 11. Hierarquia de Foco (WCAG AA)

| Par | Contraste | Status |
|---|---|---|
| `#15A898` sobre `#FFFFFF` | 3.5:1 | ✓ AA para texto grande / componentes |
| `#0D7A6D` sobre `#FFFFFF` | 5.2:1 | ✓ AA texto normal |
| `#1A2B2A` sobre `#F3F6F5` | 14.8:1 | ✓ AAA |
| `#E4F5F3` texto `#0D7A6D` | 5.2:1 | ✓ AA |
| `#1DC9B5` sobre `#192827` | 5.8:1 | ✓ AA |
| `#C84A3C` sobre `#FFFFFF` | 4.6:1 | ✓ AA |
| `#4E6A68` sobre `#FFFFFF` | 5.0:1 | ✓ AA |

Focus ring padrão: `box-shadow: 0 0 0 2px #fff, 0 0 0 4px #15A898` (offset em branco garante visibilidade em superfícies coloridas)

---

## 12. Anti-Patterns — Proibido Explicitamente

### Tipografia & Fonte
- `Inter` — **BANIDO**. Substituir por `Outfit` em todos os arquivos
- Fontes serif (`Times New Roman`, `Georgia`, `Garamond`) — banidas em qualquer parte do sistema
- Texto em maiúsculo decorativo em corpo de texto — apenas cabeçalhos de tabela (10px, tracked)
- Hierarquia feita apenas por tamanho — usar peso e cor como diferenciadores primários

### Cores & Visual
- `#000000` puro — usar `#1A2B2A` como máximo de escuro
- Roxo/neon/gradiente fluorescente — arquitetura de cor totalmente diferente
- Glow externo em botões (`box-shadow` neon) — **BANIDO**
- Gradiente de texto em títulos grandes — banido
- Vermelho coral (`#C84A3C`) para qualquer uso não-crítico (decoração, ênfase, ícones)
- Mais de um acento de alta saturação simultaneamente

### Layout & Componentes
- 3 cards iguais em linha horizontal — usar assimetria ou scroll
- Elementos sobrepostos — cada elemento tem zona espacial própria
- `calc()` hacks percentuais — usar CSS Grid
- `h-screen` — sempre `min-h-[100dvh]`
- Spinner circular genérico — usar skeleton shimmer

### Conteúdo
- Emojis em qualquer parte da UI
- Clichês de IA: "Poderoso", "Revolucionário", "Inteligente", "Next-Gen", "Potencialize"
- Dados fabricados em seções de KPI — usar placeholder `[valor]` se dado real não disponível
- Seções "ESTATÍSTICAS DO SISTEMA" com métricas inventadas
- Nomes genéricos: "João Silva", "Clínica Modelo", "Paciente 001"
- Texto de scroll: "Role para explorar", setas saltitantes, chevrons de scroll

### Interação
- Cursor customizado — **banido**
- Modais sem foco gerenciado (acessibilidade)
- Toasts que desaparecem em menos de 3 segundos
- Animações em `top`, `left`, `width`, `height` — apenas `transform` e `opacity`
