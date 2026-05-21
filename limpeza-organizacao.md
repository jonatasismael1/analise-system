# Limpeza e Organização do Projeto

> Executada em: 2026-05-21  
> Projeto: ClinicPro / Análise Saúde  
> Stack: React 18 + TypeScript + Vite + Supabase + Tailwind CSS  
> WhatsApp: Evolution API (WAHA removido completamente)

---

## 1. Resumo do que foi feito

Limpeza completa em duas rodadas. Nenhuma funcionalidade foi alterada, nenhuma regra de negócio modificada, nenhum design alterado.

**Rodada 1 — Segurança e arquivos gerados:**
- Removido `credenciais.md` com todas as chaves expostas
- Removidos arquivos de cache TypeScript e config Vite duplicado
- Criado `.gitignore` na raiz do workspace
- Atualizado `.gitignore` do projeto

**Rodada 2 — WAHA e organização:**
- Removido todo código, infra e documentação relacionados ao WAHA (migrado para Evolution API)
- Removida documentação histórica sem uso (ajustes, auditorias antigas)
- Organizada raiz do workspace — documentação solta movida para `docs/`

---

## 2. Arquivos removidos

### Segurança crítica
| Arquivo | Motivo |
|---|---|
| `credenciais.md` (raiz `analise/`) | Continha senhas, tokens e API keys em texto puro |

### WAHA — descontinuado (Evolution API substituiu)
| Arquivo | Motivo |
|---|---|
| `src/services/wahaService.ts` | Orfão — nenhum arquivo importava; funcionalidade duplicada em evolutionService |
| `docker-compose.waha.yml` | Infra WAHA descontinuada |
| `supabase/functions/waha-webhook/` | Edge Function WAHA — não usada |
| `supabase/functions/waha-status/` | Edge Function WAHA — não usada |
| `supabase/functions/waha-send-message/` | Edge Function WAHA — não usada |

### Documentação obsoleta
| Arquivo | Motivo |
|---|---|
| `ajustes_2.md` | Histórico de ajustes — sem uso operacional |
| `ajustes_3.md` | Histórico de ajustes — sem uso operacional |
| `auditoria1.md` | Auditoria antiga — desatualizada |
| `DIAGNOSTICO_DEBY_AI.md` | Diagnóstico pontual — cumprido |
| `ENTREGA_DEBY_AI.md` | Relatório de entrega — cumprido |
| `FRONTEND_AUDIT.md` | Auditoria de frontend — desatualizada |
| `IMPLEMENTATION.md` | Plano de implementação — projeto já em produção |
| `limpeza.md` (raiz `analise/`) | Instrução de limpeza — executada |

### Arquivos gerados automaticamente
| Arquivo | Motivo |
|---|---|
| `tsconfig.app.tsbuildinfo` | Cache TypeScript — regenerado pelo build |
| `tsconfig.node.tsbuildinfo` | Cache TypeScript — regenerado pelo build |
| `vite.config.js` | Versão compilada do `vite.config.ts` — redundante |
| `vite.config.d.ts` | Declaração de tipos gerada — redundante |

### Arquivos de log (bloqueados — ação pendente)
Os arquivos abaixo estão travados por processo ativo (servidor Vite):
- `vite-dev.log`
- `vite-dev.err.log`

Já estão protegidos pelo `.gitignore` (`vite-dev*.log`). Deletar manualmente quando o servidor estiver parado.

---

## 3. Arquivos movidos (organização)

| De | Para | Motivo |
|---|---|---|
| `analise/00_PRODUCT_VISION1.md` | `analise/docs/product-vision.md` | Organização de docs soltos na raiz |
| `analise/melhorias.md` | `analise/docs/melhorias.md` | Organização de docs soltos na raiz |
| `analise/ideia_design.md` | `analise/docs/ideia_design.md` | Organização de docs soltos na raiz |
| `clinicpro-deby-ai/SYSTEM_SPECIFICATION.md` | `clinicpro-deby-ai/docs/SYSTEM_SPECIFICATION.md` | Organização de docs da raiz do projeto |

---

## 4. Arquivos mantidos propositalmente

| Arquivo / Pasta | Motivo |
|---|---|
| `agends.md/agents.md` | Arquivo de agentes — protegido, essencial para automações |
| `supabase/migrations/` (17 arquivos) | Estrutura do banco — crítico, nunca remover |
| `supabase/functions/` (evolution-*, deby-ai, quick-action, create-staff-user) | Edge Functions ativas em produção |
| `supabase/functions/_shared/` | Utilitários compartilhados entre funções |
| `.claude/design/` | Assets de design para agentes |
| `stitch_clinic_pro_ai_scheduler/` | Referência visual de design das telas |
| `clinicpro-deby-ai/.env.local` | Credenciais locais — protegido pelo `.gitignore` |
| `.env.local` (raiz) | Idem — protegido pelo novo `.gitignore` |
| `.mcp.json` | Configuração MCP — protegido pelo `.gitignore` |
| `DESIGN.md` | Design system ativo — usado pelos agentes |
| `README.md` | Documentação principal |
| `netlify.toml` | Configuração de deploy |
| `docker-compose.*.yml` (se houver Evolution) | Infra ativa |
| `src/pages/AdminPage.tsx` (re-export) | Necessário — App.tsx importa dali |

---

## 5. Ajustes de segurança

### Resolvido
- `credenciais.md` removido — risco eliminado
- Header `x-waha-signature` removido do CORS em `supabase/functions/_shared/http.ts`
- `.gitignore` criado na raiz do workspace
- `.gitignore` do projeto reforçado com logs, builds, gerados e credenciais

### Pendente — requer ação manual do usuário
| Item | Risco | Ação |
|---|---|---|
| Secrets em `.claude/settings.json` | Scripts PowerShell contêm token Supabase CLI | Substituir por variável de ambiente |
| Credenciais de `.env.local` | Tokens que estavam em `credenciais.md` podem ter sido expostos | **Rotacionar todos os secrets:** Supabase CLI token, OpenRouter API Key, WAHA API Key (mesmo sem WAHA, pode estar exposto) |

---

## 6. Dependências revisadas

### Não removidas — requerem confirmação
| Pacote | Situação | Comando para remover |
|---|---|---|
| `pg` | Não encontrado em uso no código | `npm uninstall pg @types/pg` |
| `@types/pg` | Idem | Idem |
| `vite-plugin-pwa` | Não configurado no vite.config.ts | `npm uninstall vite-plugin-pwa` |

---

## 7. Validação

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ Passou — 0 erros, 7 warnings pré-existentes |
| `npm run build` | ✅ Passou — 8.83s, 1.679 módulos |
| `npm run typecheck` | ✅ Via `tsc -b` no build — sem erros |

---

## 8. Estrutura final do workspace

```
analise/
├── .claude/              ← configs Claude Code + design assets
├── clinicpro-deby-ai/    ← projeto principal
│   ├── src/              ← código-fonte React/TypeScript
│   ├── supabase/         ← migrations + Edge Functions
│   ├── public/           ← assets públicos
│   ├── agends.md/        ← agentes (manter)
│   │   └── agents.md
│   ├── stitch_clinic_pro_ai_scheduler/  ← designs Stitch
│   ├── docs/             ← documentação do projeto
│   │   └── SYSTEM_SPECIFICATION.md
│   ├── dist/             ← build (coberto pelo .gitignore)
│   ├── node_modules/     ← dependências (coberto pelo .gitignore)
│   ├── DESIGN.md         ← design system ativo
│   ├── README.md
│   ├── .env.example
│   ├── netlify.toml
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig*.json
├── docs/                 ← documentação geral
│   ├── PRD.md
│   ├── design-system.md
│   ├── evolution-skill.md
│   ├── product-vision.md
│   ├── melhorias.md
│   └── ideia_design.md
├── public/               ← logo e assets públicos
├── .env.local            ← credenciais locais (ignorado pelo git)
├── .gitignore
└── .mcp.json             ← config MCP (ignorado pelo git)
```

## 9. Pendências e cuidados futuros

1. **URGENTE — Rotacionar secrets:** mesmo sem `credenciais.md`, os valores podem ter sido copiados. Regenerar todos os tokens (Supabase, OpenRouter, Evolution API).
2. **Logs bloqueados:** fechar o servidor de desenvolvimento e deletar `vite-dev.log` e `vite-dev.err.log`.
3. **Dependências extras:** confirmar se `pg`, `@types/pg` e `vite-plugin-pwa` são necessários e remover se não forem.
4. **Campo `waha_message_id`:** o nome do campo em `whatsapp_mensagens` é um legado do WAHA, mas a Evolution API também o usa para deduplicação. Renomear para `message_id` em futura migration se desejado.
5. **Pasta `agends.md/`:** nome confuso (parece arquivo, é pasta). Renomear para `agents/` quando conveniente.
6. **Bundle JS grande (~974 KB):** considerar code splitting com `React.lazy()` para melhorar performance.
