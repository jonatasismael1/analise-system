# Especificação do Sistema: Clinic Pro IA

Este documento descreve a identidade visual e as especificações técnicas necessárias para replicar o **Clinic Pro** e seu **Motor de Crescimento IA** em qualquer ambiente Antigravity ou similar.

---

## 1. Identidade Visual (Design System)

### Mood & Estética
- **Conceito**: Clinical Modernism (Modernismo Clínico).
- **Vibe**: Precisão, confiança, limpeza e tecnologia.
- **Layout**: Uso massivo de espaços em branco, cartões com bordas sutis e tipografia clara.

### Cores (Paleta Tailwind)
- **Primary**: `#005c55` (Teal Escuro - representa saúde e sobriedade).
- **Primary Container**: `#0f766e` (Teal Vibrante - para botões e estados ativos).
- **Background**: `#f7f9fb` (Cinza Azulado muito claro - evita o branco puro "agressivo").
- **Surface**:
  - Low: `#f2f4f6`
  - Normal: `#eceef0`
  - High: `#e6e8ea`
- **Textos**:
  - Principal: `#191c1e` (Quase preto, alta legibilidade).
  - Variante/Secundário: `#3e4947` (Cinza esverdeado).
- **Outlines**: `#bdc9c6` (Bordas finas de 1px).

### Tipografia
- **Fonte**: `Inter` (Sans-serif).
- **Configuração**:
  - Títulos: `font-bold tracking-tight text-on-surface`.
  - Labels: `text-[10px] uppercase font-black tracking-widest text-on-surface-variant`.
  - Corpo: `text-sm font-medium`.

### Componentes & UI
- **Border Radius**: `12px` (XL no Tailwind) para a maioria dos cards. `full` para botões de ação secundária.
- **Bordas**: Sempre 1px sólidos com a cor `outline-variant`.
- **Shadows**: Sombras extremamente sutis (`shadow-sm`) que aumentam levemente no hover.

---

## 2. Motor de Crescimento IA (Growth Engine)

Este é o módulo principal de inteligência de negócios.

### Estrutura Funcional
1. **Painel de Controle (Esquerda)**:
   - Formulário de parâmetros: Objetivo (Retenção, Atração, Ticket Médio), Público-alvo, Orçamento.
   - Botão de ação com estado de carregamento (AI Thinking).
   - "Pro Tip": Um card com cor de fundo primária suave que exibe um insight automático baseado no contexto.

2. **Palco de Resultados (Direita)**:
   - Estado vazio: Ilustração/Ícone indicando para iniciar a análise.
   - Estado de Resultado (Após geração):
     - **Métricas de Impacto**: ROI estimado, Taxa de conversão, Faturamento previsto.
     - **Sugestão de Copy**: Texto formatado para canais de comunicação (WhatsApp/SMS).
     - **Checklist de Implementação**: Lista de passos operacionais para o time da clínica seguir.

### Instruções para o Antigravity (Prompting)
Para recriar este recurso, utilize a seguinte instrução:
> "Crie uma página de 'Motor de Crescimento IA' para uma clínica médica. Use um layout de duas colunas. À esquerda, um card de parâmetros com um seletor de objetivos e público-alvo. À direita, uma área de exibição dinâmica que usa `motion` para animar a entrada de um plano de marketing sugerido pela IA, incluindo cards de previsão de ROI, um bloco de texto com sugestão de mensagem para WhatsApp e um checklist de tarefas operacionais. Mantenha a paleta de cores teal escuro e cinzas clínicos."

---

## 3. Stack Técnica Recomendada

- **Frontend**: React 18+ com TypeScript.
- **Estilização**: Tailwind CSS (Preferencialmente v4 ou superior configurado via `@theme`).
- **Ícones**: `lucide-react` (Use `BrainCircuit`, `Sparkles`, `TrendingUp`, `Target`).
- **Animações**: `motion/react` (Framer Motion) para transições entre passos e modais.
- **Gráficos**: `recharts` para dashboards financeiros complementares.

---

## 4. Estrutura de Arquivos Base
- `src/index.css`: Definição de temas e variáveis de cores.
- `src/components/Sidebar.tsx`: Navegação lateral focada em administração.
- `src/pages/GrowthEngine.tsx`: Implementação da lógica de IA explicada acima.
