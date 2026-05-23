import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Mic, MicOff, Pause, Play, ShieldAlert, Square, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import type { Patient } from "../../types/clinic";

export interface DraftResult {
  id: string;
  structured: Record<string, string>;
  rawTranscription: string;
}

interface Props {
  readonly clinicId: string;
  readonly patient: Patient;
  readonly currentUserId: string;
  readonly currentUserName: string;
  readonly onDraftReady: (result: DraftResult) => void;
  readonly onClose: () => void;
}

type Step = "consent" | "recording" | "paused" | "processing";

function getSpeechAPI(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function ConsultationListener({ clinicId, patient, currentUserId, currentUserName, onDraftReady, onClose }: Props) {
  const [step, setStep] = useState<Step>("consent");
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [contextNotes, setContextNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState("");

  const SpeechAPI = getSpeechAPI();
  const useFallback = !SpeechAPI;

  // ── Refs anti-duplicação ────────────────────────────────────────────────────
  // Cada vez que criamos uma nova instância SpeechRecognition, incrementamos
  // sessionIdRef. Os callbacks verificam o sessionId ao disparar — se não bate,
  // são de uma sessão antiga e são descartados.
  const sessionIdRef  = useRef(0);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  // Texto final acumulado de todas as sessões da gravação atual
  const accumulatedRef = useRef("");

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      destroyRecognition();
    };
  }, []);

  function destroyRecognition() {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.abort(); } catch { /* ignored */ }
    // Remove todos os listeners para evitar callbacks fantasmas
    recognitionRef.current.onresult = null;
    recognitionRef.current.onerror  = null;
    recognitionRef.current.onend    = null;
    recognitionRef.current = null;
  }

  // ── Cria nova instância e inicia — SEMPRE nova instância no restart ─────────
  // Chrome Android tem quirk: reusar a mesma instância após onend faz o browser
  // re-processar áudio em buffer e re-disparar resultados já finalizados,
  // causando a duplicação. A solução é criar nova instância a cada restart.
  function createAndStart(sessionId: number) {
    if (!SpeechAPI || !isRecordingRef.current) return;

    destroyRecognition();

    const rec = new SpeechAPI();
    recognitionRef.current = rec;

    rec.lang           = "pt-BR";
    rec.continuous     = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // ── onresult ─────────────────────────────────────────────────────────────
    // CRÍTICO: iterar a partir de event.resultIndex, não de 0.
    // event.resultIndex aponta o primeiro resultado NOVO neste evento.
    // Iterar desde 0 é a causa mais comum de duplicação.
    rec.onresult = (event: any) => {
      if (sessionId !== sessionIdRef.current) return; // sessão obsoleta

      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text: string = result[0].transcript;
        if (result.isFinal) {
          // Adiciona espaço separador apenas se o acumulado não terminar em espaço
          const sep = accumulatedRef.current.endsWith(" ") || accumulatedRef.current === "" ? "" : " ";
          accumulatedRef.current += sep + text.trim();
          setFinalText(accumulatedRef.current);
        } else {
          interim += text;
        }
      }
      setInterimText(interim);
    };

    // ── onerror ──────────────────────────────────────────────────────────────
    rec.onerror = (event: any) => {
      if (sessionId !== sessionIdRef.current) return;
      if (event.error === "not-allowed") {
        setError("Permissão de microfone negada. Habilite nas configurações do navegador.");
        isRecordingRef.current = false;
        setStep("paused");
      }
      // "no-speech" e "aborted" são ignorados — onend cuidará do restart
    };

    // ── onend ────────────────────────────────────────────────────────────────
    // Chrome Android encerra a sessão silenciosamente com mais frequência do
    // que o desktop. Auto-restart SEMPRE com nova instância.
    rec.onend = () => {
      if (sessionId !== sessionIdRef.current) return;
      setInterimText("");
      if (!isRecordingRef.current) return;

      // Nova sessão → novo ID → nova instância
      const nextId = sessionId + 1;
      sessionIdRef.current = nextId;

      // Pequeno delay para evitar loop de restart imediato no Android
      setTimeout(() => {
        if (isRecordingRef.current && sessionIdRef.current === nextId) {
          createAndStart(nextId);
        }
      }, 300);
    };

    try {
      rec.start();
    } catch {
      // Se já estava iniciando (race condition), ignora
    }
  }

  // ── API pública ──────────────────────────────────────────────────────────────

  function startRecognition() {
    if (useFallback) {
      setStep("recording");
      return;
    }
    const newId = sessionIdRef.current + 1;
    sessionIdRef.current = newId;
    isRecordingRef.current = true;
    setError(null);
    setStep("recording");
    createAndStart(newId);
  }

  function pauseRecording() {
    isRecordingRef.current = false;
    // Marca sessão como encerrada antes de abortar para onend não fazer restart
    sessionIdRef.current += 1;
    destroyRecognition();
    setInterimText("");
    setStep("paused");
  }

  async function generateDraft() {
    isRecordingRef.current = false;
    sessionIdRef.current += 1;
    destroyRecognition();
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
          clinica_id:       clinicId,
          paciente_id:      patient.id,
          criado_por:       currentUserId,
          criado_por_nome:  currentUserName,
          raw_transcription: transcript || null,
          context_notes:    contextNotes.trim() || null,
          status:           "gerando_rascunho",
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);

      const inputText = [
        transcript    ? `TRANSCRIÇÃO DA CONSULTA:\n${transcript}` : "",
        contextNotes.trim() ? `\nOBSERVAÇÕES DO MÉDICO:\n${contextNotes.trim()}` : "",
      ].filter(Boolean).join("\n");

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
    } catch (e: any) {
      const msg = e?.message ?? e?.error_description ?? String(e) ?? "Erro ao gerar rascunho.";
      setError(msg);
      setStep("paused");
    }
  }

  const hasContent  = useFallback ? fallbackText.trim().length > 0 : finalText.length > 0;
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
      <div className="flex-1 space-y-4 overflow-y-auto p-5">

        {/* CONSENT */}
        {step === "consent" && (
          <>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Aviso de consentimento — LGPD
              </div>
              <p className="text-sm leading-relaxed">
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
                  {useFallback ? <MicOff className="h-4 w-4 text-ink-muted" /> : <Mic className="h-4 w-4 text-ink-muted" />}
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
                  className="w-full resize-none rounded-2xl border border-border-strong bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
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
                      {interimText && <span className="italic text-ink-muted"> {interimText}</span>}
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
                className="w-full resize-none rounded-2xl border border-border-strong bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
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
              {["Processando transcrição", "Estruturando dados clínicos", "Preenchendo campos do prontuário"].map((label, i) => (
                <div key={label} className="flex items-center gap-2 text-xs text-ink-muted">
                  <Loader2 className="h-3 w-3 animate-spin" style={{ animationDelay: `${i * 200}ms` }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 space-y-2 border-t border-border p-5">
        {step === "consent" && (
          <>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
              onClick={startRecognition}
              type="button"
            >
              <Mic className="h-4 w-4" />
              {useFallback ? "Iniciar digitação manual" : "Iniciar escuta"}
            </button>
            <button
              className="w-full rounded-2xl py-2.5 text-sm font-medium text-ink-secondary transition hover:bg-surface-low"
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
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-border-strong py-2.5 text-sm font-medium text-ink transition hover:bg-surface-low"
                onClick={pauseRecording}
                type="button"
              >
                <Pause className="h-4 w-4" />
                Pausar
              </button>
            )}
            <button
              className={`flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50 ${useFallback ? "col-span-2" : ""}`}
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
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-primary py-2.5 text-sm font-medium text-primary transition hover:bg-primary/5"
                onClick={startRecognition}
                type="button"
              >
                <Play className="h-4 w-4" />
                Continuar
              </button>
            )}
            <button
              className={`flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50 ${useFallback ? "col-span-2" : ""}`}
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
