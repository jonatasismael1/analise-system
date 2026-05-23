import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Mic, MicOff, Pause, Play, ShieldAlert, Square, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import type { ClinicUser, Patient } from "../../types/clinic";

export interface DraftResult {
  id: string;
  structured: Record<string, string>;
  rawTranscription: string;
}

interface Props {
  readonly clinicId: string;
  readonly patient: Patient;
  readonly profile: ClinicUser;
  readonly onDraftReady: (result: DraftResult) => void;
  readonly onClose: () => void;
}

type Step = "consent" | "recording" | "paused" | "processing";

function getSpeechAPI() {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

export function ConsultationListener({ clinicId, patient, profile, onDraftReady, onClose }: Props) {
  const [step, setStep] = useState<Step>("consent");
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [contextNotes, setContextNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState("");

  const SpeechAPI = getSpeechAPI();
  const useFallback = !SpeechAPI;

  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const accumulatedRef = useRef("");

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      try { recognitionRef.current?.abort(); } catch { /* ignored */ }
    };
  }, []);

  function startRecognition() {
    if (useFallback) {
      setStep("recording");
      return;
    }

    const rec = new SpeechAPI();
    recognitionRef.current = rec;
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulatedRef.current += text + " ";
          setFinalText(accumulatedRef.current);
        } else {
          interim += text;
        }
      }
      setInterimText(interim);
    };

    rec.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("Permissão de microfone negada. Habilite nas configurações do navegador.");
        isRecordingRef.current = false;
        setStep("paused");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
    };

    rec.onend = () => {
      setInterimText("");
      // Auto-restart when continuous mode stops due to silence
      if (isRecordingRef.current) {
        setTimeout(() => {
          if (isRecordingRef.current) {
            try { rec.start(); } catch { /* already starting */ }
          }
        }, 250);
      }
    };

    isRecordingRef.current = true;
    try {
      rec.start();
      setStep("recording");
      setError(null);
    } catch {
      setError("Não foi possível iniciar o microfone.");
    }
  }

  function pauseRecording() {
    isRecordingRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ignored */ }
    setInterimText("");
    setStep("paused");
  }

  async function generateDraft() {
    isRecordingRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ignored */ }
    setInterimText("");
    setStep("processing");
    setError(null);

    const transcript = useFallback ? fallbackText.trim() : accumulatedRef.current.trim();

    if (!transcript && !contextNotes.trim()) {
      setError("Nenhuma transcrição disponível. Adicione texto ou inicie a gravação.");
      setStep("paused");
      return;
    }

    try {
      const { data: draftRow, error: insertError } = await supabase
        .from("ai_prontuario_drafts")
        .insert({
          clinica_id: clinicId,
          paciente_id: patient.id,
          criado_por: profile.userId,
          criado_por_nome: profile.nome,
          raw_transcription: transcript || null,
          context_notes: contextNotes.trim() || null,
          status: "gerando_rascunho",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      const inputText = [
        transcript ? `TRANSCRIÇÃO DA CONSULTA:\n${transcript}` : "",
        contextNotes.trim() ? `\nOBSERVAÇÕES DO MÉDICO:\n${contextNotes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const { data: aiResult, error: fnError } = await supabase.functions.invoke("deby-ai", {
        body: { clinicId, action: "transcribe_consultation", module: "prontuario", input: inputText },
      });

      if (fnError) throw new Error(fnError.message);
      if (aiResult?.error) throw new Error(aiResult.error);

      let structured: Record<string, string>;
      try {
        structured = JSON.parse(aiResult.output);
      } catch {
        const match = (aiResult.output as string).match(/\{[\s\S]*\}/);
        if (match) {
          structured = JSON.parse(match[0]);
        } else {
          throw new Error("Deby AI retornou uma resposta inesperada. Tente novamente.");
        }
      }

      await supabase
        .from("ai_prontuario_drafts")
        .update({ structured_data: structured, status: "aguardando_revisao" })
        .eq("id", draftRow.id);

      onDraftReady({ id: draftRow.id, structured, rawTranscription: transcript });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar rascunho. Tente novamente.");
      setStep("paused");
    }
  }

  const hasContent = useFallback ? fallbackText.trim().length > 0 : finalText.length > 0;
  const canGenerate = hasContent || contextNotes.trim().length > 0;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Deby AI — Ouvir Atendimento</p>
            <p className="text-xs text-ink-secondary">{patient.nome}</p>
          </div>
        </div>
        <button
          className="rounded-xl p-1.5 text-ink-muted hover:bg-surface-low disabled:opacity-40"
          onClick={onClose}
          type="button"
          disabled={step === "processing"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* CONSENT */}
        {step === "consent" && (
          <>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Aviso de consentimento — LGPD
              </div>
              <p className="leading-relaxed text-sm">
                Esta função captura a conversa do atendimento <strong>localmente no seu dispositivo</strong>,
                transcreve o áudio e usa a Deby AI para gerar um rascunho clínico estruturado.
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-amber-700">
                <li>O áudio <strong>não é armazenado</strong> permanentemente.</li>
                <li>O rascunho gerado <strong>não é salvo automaticamente</strong> no prontuário.</li>
                <li>O médico deve revisar e confirmar antes de aplicar.</li>
                <li>Certifique-se que o paciente está ciente da transcrição.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-surface-low px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">Paciente</p>
              <p className="mt-1 text-sm font-medium text-ink">{patient.nome}</p>
            </div>

            {useFallback && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                Seu navegador não suporta captura de áudio automática (use Chrome para ativar).
                Você poderá digitar a transcrição manualmente.
              </div>
            )}
          </>
        )}

        {/* RECORDING / PAUSED */}
        {(step === "recording" || step === "paused") && (
          <>
            <div className="flex items-center gap-3">
              {step === "recording" && !useFallback ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                </div>
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-variant">
                  {useFallback ? (
                    <MicOff className="h-4 w-4 text-ink-muted" />
                  ) : (
                    <Mic className="h-4 w-4 text-ink-muted" />
                  )}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-ink">
                  {useFallback ? "Digitação manual" : step === "recording" ? "Gravando..." : "Pausado"}
                </p>
                <p className="text-xs text-ink-muted">
                  {useFallback ? "Digite a conversa abaixo" : "Fale naturalmente durante a consulta"}
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Transcript */}
            {useFallback ? (
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">
                  Transcrição manual
                </label>
                <textarea
                  className="w-full rounded-2xl border border-border-strong bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] resize-none"
                  rows={8}
                  placeholder="Digite aqui a conversa do atendimento..."
                  value={fallbackText}
                  onChange={(e) => setFallbackText(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">
                  Transcrição em tempo real
                </label>
                <div className="max-h-48 min-h-32 overflow-y-auto rounded-2xl border border-border bg-surface-low p-4 text-sm leading-relaxed text-ink">
                  {finalText || interimText ? (
                    <>
                      {finalText}
                      {interimText && <span className="italic text-ink-muted">{interimText}</span>}
                    </>
                  ) : (
                    <span className="italic text-ink-muted">
                      {step === "recording" ? "Aguardando fala..." : "Nenhum texto capturado ainda."}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Context notes */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">
                Observações adicionais{" "}
                <span className="font-normal normal-case text-ink-muted">(opcional)</span>
              </label>
              <textarea
                className="w-full rounded-2xl border border-border-strong bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] resize-none"
                rows={3}
                placeholder="Contexto extra para a Deby AI (ex: retorno pós-cirúrgico, paciente hipertenso...)"
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
              />
            </div>
          </>
        )}

        {/* PROCESSING */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Gerando rascunho clínico...</p>
              <p className="mt-1 text-xs text-ink-secondary">
                A Deby AI está organizando as informações da consulta.
              </p>
            </div>
            <div className="w-full space-y-2 text-left">
              {[
                "Processando transcrição",
                "Estruturando dados clínicos",
                "Preenchendo campos do prontuário",
              ].map((label, i) => (
                <div key={label} className="flex items-center gap-2 text-xs text-ink-muted">
                  <Loader2
                    className="h-3 w-3 animate-spin"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border p-5 space-y-2">
        {step === "consent" && (
          <>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark transition"
              onClick={startRecognition}
              type="button"
            >
              <Mic className="h-4 w-4" />
              {useFallback ? "Iniciar digitação manual" : "Iniciar escuta"}
            </button>
            <button
              className="w-full rounded-2xl py-2.5 text-sm font-medium text-ink-secondary hover:bg-surface-low transition"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
          </>
        )}

        {step === "recording" && (
          <div className="grid grid-cols-2 gap-2">
            {!useFallback && (
              <button
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-border-strong py-2.5 text-sm font-medium text-ink hover:bg-surface-low transition"
                onClick={pauseRecording}
                type="button"
              >
                <Pause className="h-4 w-4" />
                Pausar
              </button>
            )}
            <button
              className={`flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition ${useFallback ? "col-span-2" : ""}`}
              onClick={() => void generateDraft()}
              type="button"
              disabled={!canGenerate}
            >
              <Square className="h-4 w-4" />
              Finalizar e gerar prontuário
            </button>
          </div>
        )}

        {step === "paused" && (
          <div className="grid grid-cols-2 gap-2">
            {!useFallback && (
              <button
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-primary py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition"
                onClick={startRecognition}
                type="button"
              >
                <Play className="h-4 w-4" />
                Continuar
              </button>
            )}
            <button
              className={`flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition ${useFallback ? "col-span-2" : ""}`}
              onClick={() => void generateDraft()}
              type="button"
              disabled={!canGenerate}
            >
              <Bot className="h-4 w-4" />
              Gerar prontuário
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
