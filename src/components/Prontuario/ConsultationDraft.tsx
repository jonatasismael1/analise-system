import { useState } from "react";
import { Bot, Check, ChevronDown, ChevronUp, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import type { ProntuarioData } from "./ProntuarioEditor";
import type { DraftResult } from "./ConsultationListener";

export const DRAFT_FIELDS = [
  { key: "queixa_principal",      label: "Queixa Principal",                mapsTo: "queixa"   },
  { key: "historia_doenca_atual", label: "História da Doença Atual",        mapsTo: "evolucao" },
  { key: "sintomas_relatados",    label: "Sintomas Relatados",              mapsTo: "evolucao" },
  { key: "antecedentes_relevantes", label: "Antecedentes Relevantes",      mapsTo: "evolucao" },
  { key: "medicamentos_em_uso",   label: "Medicamentos em Uso",             mapsTo: "evolucao" },
  { key: "alergias_relatadas",    label: "Alergias Relatadas",              mapsTo: "evolucao" },
  { key: "hipoteses_observacoes", label: "Hipóteses / Observações Clínicas",mapsTo: "evolucao" },
  { key: "resumo_consulta",       label: "Resumo da Consulta",              mapsTo: "evolucao" },
  { key: "conduta_orientacoes",   label: "Conduta / Orientações",           mapsTo: "conduta"  },
  { key: "exames_solicitados",    label: "Exames Solicitados",              mapsTo: "conduta"  },
  { key: "retorno_recomendado",   label: "Retorno Recomendado",             mapsTo: "conduta"  },
] as const;

const NA = "Não informado na conversa.";

export function draftToProntuarioData(
  structured: Record<string, string>,
  checked: Set<string>,
  profissionalId: string
): ProntuarioData {
  const queixa =
    checked.has("queixa_principal") && structured.queixa_principal !== NA
      ? (structured.queixa_principal ?? "")
      : "";

  const evolucaoFields = [
    { key: "historia_doenca_atual", label: "História da Doença Atual" },
    { key: "sintomas_relatados",    label: "Sintomas Relatados" },
    { key: "antecedentes_relevantes", label: "Antecedentes Relevantes" },
    { key: "medicamentos_em_uso",   label: "Medicamentos em Uso" },
    { key: "alergias_relatadas",    label: "Alergias Relatadas" },
    { key: "hipoteses_observacoes", label: "Hipóteses / Observações" },
    { key: "resumo_consulta",       label: "Resumo" },
  ];

  const evolucaoHtml = evolucaoFields
    .filter((f) => checked.has(f.key) && structured[f.key] && structured[f.key] !== NA)
    .map((f) => `<p><strong>${f.label}:</strong> ${structured[f.key]}</p>`)
    .join("");

  const condutaParts = [
    checked.has("conduta_orientacoes") && structured.conduta_orientacoes !== NA
      ? structured.conduta_orientacoes
      : null,
    checked.has("exames_solicitados") && structured.exames_solicitados !== NA
      ? `Exames solicitados: ${structured.exames_solicitados}`
      : null,
    checked.has("retorno_recomendado") && structured.retorno_recomendado !== NA
      ? `Retorno: ${structured.retorno_recomendado}`
      : null,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  return { queixa, evolucao: evolucaoHtml, conduta: condutaParts, profissionalId };
}

interface Props {
  readonly draft: DraftResult;
  readonly clinicId: string;
  readonly profissionalId: string;
  readonly onApply: (data: ProntuarioData) => void;
  readonly onDiscard: () => void;
  readonly onRegenerate: () => void;
}

const MAPS_TO_LABEL: Record<string, string> = {
  queixa: "Queixa",
  evolucao: "Evolução",
  conduta: "Conduta",
};

export function ConsultationDraft({ draft, profissionalId, onApply, onDiscard, onRegenerate }: Props) {
  const [fields, setFields] = useState<Record<string, string>>({ ...draft.structured });
  const [checked, setChecked] = useState<Set<string>>(new Set(DRAFT_FIELDS.map((f) => f.key)));
  const [showTranscript, setShowTranscript] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  function toggleField(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleDiscard() {
    setDiscarding(true);
    await supabase
      .from("ai_prontuario_drafts")
      .update({ status: "descartado", discarded_at: new Date().toISOString() })
      .eq("id", draft.id);
    onDiscard();
  }

  function handleApply() {
    const data = draftToProntuarioData(fields, checked, profissionalId);
    void supabase
      .from("ai_prontuario_drafts")
      .update({ status: "aplicado", applied_at: new Date().toISOString() })
      .eq("id", draft.id);
    onApply(data);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto my-6 w-full max-w-2xl rounded-3xl border border-border bg-surface shadow-modal">

        {/* Header */}
        <div className="flex items-start gap-4 border-b border-border px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-ink">Rascunho gerado pela Deby AI</h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Revise e edite cada campo. Use as caixas de seleção para incluir ou excluir da aplicação.
            </p>
          </div>
        </div>

        {/* Notice */}
        <div className="mx-6 mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          Nenhum dado é salvo automaticamente. Clique em{" "}
          <strong>Aplicar ao prontuário</strong> para confirmar.
        </div>

        {/* Fields */}
        <div className="space-y-3 p-6">
          {DRAFT_FIELDS.map((field) => {
            const isChecked = checked.has(field.key);
            return (
              <div
                key={field.key}
                className={`rounded-2xl border p-4 transition ${
                  isChecked
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-surface-low opacity-60"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleField(field.key)}
                      className="h-3.5 w-3.5 rounded border-border accent-primary"
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">
                      {field.label}
                    </span>
                  </label>
                  <span className="rounded-full bg-surface-variant px-2 py-0.5 text-[9px] font-medium text-ink-muted">
                    → {MAPS_TO_LABEL[field.mapsTo]}
                  </span>
                </div>
                <textarea
                  className="w-full resize-none rounded-xl border border-border-strong bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] disabled:cursor-not-allowed disabled:bg-surface-low disabled:text-ink-muted"
                  rows={2}
                  value={fields[field.key] ?? ""}
                  disabled={!isChecked}
                  onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            );
          })}
        </div>

        {/* Transcript collapsible */}
        {draft.rawTranscription && (
          <div className="mx-6 mb-5">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-border px-4 py-2.5 text-xs text-ink-secondary hover:bg-surface-low transition"
              onClick={() => setShowTranscript((v) => !v)}
            >
              <span>Ver transcrição original</span>
              {showTranscript ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showTranscript && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-2xl border border-border bg-surface-low px-4 py-3 text-xs leading-relaxed text-ink-muted">
                {draft.rawTranscription}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="flex gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-2xl border border-border-strong px-3.5 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-low disabled:opacity-50 transition"
              onClick={() => void handleDiscard()}
              disabled={discarding}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Descartar
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-2xl border border-border-strong px-3.5 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-low transition"
              onClick={onRegenerate}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerar
            </button>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition"
            onClick={handleApply}
          >
            <Check className="h-4 w-4" />
            Aplicar ao prontuário
          </button>
        </div>
      </div>
    </div>
  );
}
