import { useCallback, useEffect, useState } from "react";
import { Bot, ChevronDown, ChevronUp, FileText, Plus, Clock, Edit2, Send, X, Loader2, Printer, ShieldCheck } from "lucide-react";
import { ProntuarioEditor, type ProntuarioData } from "./ProntuarioEditor";
import { ConsultationListener, type DraftResult } from "./ConsultationListener";
import { ConsultationDraft, draftToProntuarioData } from "./ConsultationDraft";
import {
  DEFAULT_INSTANCE_NAME,
  sendWhatsAppText
} from "../../services/quickActionService";
import {
  fetchProntuarioAccessLogs,
  loadProntuarios,
  saveProntuario,
  type ProntuarioAccessLogEntry,
} from "../../services/prontuarioService";
import { useAuth } from "../../contexts/AuthContext";
import type { Patient, Professional } from "../../types/clinic";

interface ProntuarioTimelineProps {
  clinicId: string;
  patient: Patient;
  professionals: Professional[];
}

function formatWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function buildReceita(patient: Patient, professional: Professional | undefined, item: ProntuarioData): string {
  const data = new Date(item.data ?? new Date()).toLocaleDateString("pt-BR", { dateStyle: "long" });
  const profNome = professional?.nome ?? "Profissional";
  const profRegistro = professional?.registro ? `\nCRM/Registro: ${professional.registro}` : "";

  const linhas: string[] = [
    `🏥 *ANÁLISE SAÚDE*`,
    `━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📋 *RECEITA MÉDICA*`,
    ``,
    `*Paciente:* ${patient.nome}`,
    `*Data:* ${data}`,
    ``,
  ];

  if (item.queixa) {
    linhas.push(`*Queixa:*`);
    linhas.push(item.queixa);
    linhas.push(``);
  }

  if (item.conduta) {
    linhas.push(`*Conduta / Prescrição:*`);
    linhas.push(item.conduta);
    linhas.push(``);
  }

  linhas.push(`━━━━━━━━━━━━━━━━━━━`);
  linhas.push(`*${profNome}*${profRegistro}`);

  return linhas.join("\n");
}

function buildReceitaHTML(patient: Patient, professional: Professional | undefined, item: ProntuarioData): string {
  const data = new Date(item.data ?? new Date()).toLocaleDateString("pt-BR", { dateStyle: "long" });
  const profNome = professional?.nome ?? "Profissional";
  const profRegistro = professional?.registro ? `CRM/Registro: ${professional.registro}` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Receita Médica - ${patient.nome}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; color: #1a1a1a; }
    .page { max-width: 720px; margin: 0 auto; padding: 40px; }
    .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 28px; }
    .header img { height: 64px; object-fit: contain; }
    .header-info h1 { font-size: 22px; color: #2563eb; font-weight: 800; }
    .header-info p { font-size: 13px; color: #666; margin-top: 4px; }
    .doc-title { font-size: 18px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; margin-bottom: 24px; }
    .meta { background: #f8fafc; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .meta-item label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #666; display: block; margin-bottom: 2px; }
    .meta-item span { font-size: 14px; color: #1a1a1a; font-weight: 600; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
    .section-body { font-size: 14px; line-height: 1.7; color: #333; background: #fafafa; border-radius: 6px; padding: 12px 16px; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 2px solid #0f172a; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-sig { font-size: 14px; font-weight: 700; color: #0f172a; }
    .footer-reg { font-size: 12px; color: #666; margin-top: 4px; }
    .footer-line { font-size: 12px; color: #aaa; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <img src="/logo-deby-saude.png" alt="Deby Saúde" onerror="this.style.display='none'" />
      <div class="header-info">
        <h1>Deby Saúde</h1>
        <p>Saúde e bem-estar com qualidade</p>
      </div>
    </div>

    <div class="doc-title">Receita Médica</div>

    <div class="meta">
      <div class="meta-item">
        <label>Paciente</label>
        <span>${patient.nome}</span>
      </div>
      <div class="meta-item">
        <label>Data</label>
        <span>${data}</span>
      </div>
      ${patient.cpf ? `<div class="meta-item"><label>CPF</label><span>${patient.cpf}</span></div>` : ""}
      ${patient.dataNascimento ? `<div class="meta-item"><label>Nascimento</label><span>${new Date(patient.dataNascimento).toLocaleDateString("pt-BR")}</span></div>` : ""}
    </div>

    ${item.queixa ? `
    <div class="section">
      <div class="section-title">Queixa Principal</div>
      <div class="section-body">${item.queixa.replace(/\n/g, "<br>")}</div>
    </div>` : ""}

    ${item.conduta ? `
    <div class="section">
      <div class="section-title">Conduta / Prescrição</div>
      <div class="section-body">${item.conduta.replace(/\n/g, "<br>")}</div>
    </div>` : ""}

    <div class="footer">
      <div>
        <div class="footer-sig">${profNome}</div>
        ${profRegistro ? `<div class="footer-reg">${profRegistro}</div>` : ""}
      </div>
      <div class="footer-line">Emitido em ${data}</div>
    </div>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

export function ProntuarioTimeline({ clinicId, patient, professionals }: ProntuarioTimelineProps) {
  const { role, profile, session } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<ProntuarioData | null>(null);
  const [receitaItem, setReceitaItem] = useState<ProntuarioData | null>(null);

  // Deby AI — Ouvir Atendimento
  const [showListener, setShowListener] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftResult | null>(null);
  const canUseAI = role === "admin" || role === "profissional";
  const [receitaTexto, setReceitaTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [envioFeedback, setEnvioFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [historico, setHistorico] = useState<ProntuarioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Histórico de acessos LGPD — visível apenas para admins
  const [accessLogs, setAccessLogs] = useState<ProntuarioAccessLogEntry[]>([]);
  const [showAccessLogs, setShowAccessLogs] = useState(false);
  const [loadingAccessLogs, setLoadingAccessLogs] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await loadProntuarios(clinicId, patient.id);
      setHistorico(records);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar prontuario.");
      setHistorico([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId, patient.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleSave = async (data: ProntuarioData) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveProntuario(clinicId, patient.id, data);
      setHistorico((current) => {
        const exists = current.some((item) => item.id === saved.id);
        if (exists) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...current];
      });
      setIsEditing(false);
      setEditingData(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar prontuario.");
    } finally {
      setSaving(false);
    }
  };

  function openReceita(item: ProntuarioData) {
    const professional = professionals.find((p) => p.id === item.profissionalId);
    setReceitaTexto(buildReceita(patient, professional, item));
    setReceitaItem(item);
    setEnvioFeedback(null);
  }

  async function handleEnviarWhatsApp() {
    if (!receitaItem || !patient.whatsapp) return;
    setEnviando(true);
    setEnvioFeedback(null);
    try {
      const phone = formatWhatsApp(patient.whatsapp);
      await sendWhatsAppText(DEFAULT_INSTANCE_NAME, phone, receitaTexto);
      setEnvioFeedback({ ok: true, msg: "Receita enviada com sucesso pelo WhatsApp!" });
    } catch (e) {
      setEnvioFeedback({
        ok: false,
        msg: e instanceof Error ? e.message : "Erro ao enviar. Verifique se o WhatsApp está conectado."
      });
    } finally {
      setEnviando(false);
    }
  }

  function handleImprimirPDF() {
    if (!receitaItem) return;
    const professional = professionals.find((p) => p.id === receitaItem.profissionalId);
    const html = buildReceitaHTML(patient, professional, receitaItem);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  /**
   * Carrega o histórico de acessos ao prontuário (apenas para admins, conforme LGPD).
   * Acionado ao expandir a seção colapsável.
   */
  async function handleToggleAccessLogs() {
    if (showAccessLogs) {
      setShowAccessLogs(false);
      return;
    }
    setShowAccessLogs(true);
    if (accessLogs.length > 0) return; // já carregado
    setLoadingAccessLogs(true);
    try {
      const logs = await fetchProntuarioAccessLogs(clinicId, patient.id, 10);
      setAccessLogs(logs);
    } finally {
      setLoadingAccessLogs(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Prontuário Clínico</h2>
          <p className="text-sm text-secondary">Paciente: {patient.nome}</p>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2">
            {canUseAI && (
              <button
                className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition"
                onClick={() => setShowListener(true)}
                disabled={loading}
                title="Transcrever e estruturar a consulta com IA"
              >
                <Bot className="h-4 w-4" />
                Deby AI
              </button>
            )}
            <button
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition"
              onClick={() => setIsEditing(true)}
              disabled={loading}
            >
              <Plus className="h-4 w-4" />
              Nova Evolução
            </button>
          </div>
        )}
      </div>

      {isEditing && (
        <ProntuarioEditor
          initialData={editingData ?? undefined}
          professionals={professionals}
          onSave={handleSave}
          isSaving={saving}
          onCancel={() => {
            setIsEditing(false);
            setEditingData(null);
          }}
        />
      )}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="relative border-l-2 border-surface-variant ml-4 pl-6 space-y-8">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando prontuario...
          </div>
        ) : historico.length === 0 ? (
          <p className="text-sm text-secondary py-4">Nenhuma evolução registrada para este paciente.</p>
        ) : (
          historico.map((item) => (
            <div key={item.id} className="relative">
              <div className="absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full border-4 border-white bg-primary text-white shadow-sm">
                <FileText className="h-3 w-3" />
              </div>

              <div className="rounded-xl border border-surface-variant bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-semibold text-primary">
                      {professionals.find((p) => p.id === item.profissionalId)?.nome ?? "Profissional"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-secondary mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.data!).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-medium text-secondary hover:border-primary hover:text-primary transition"
                      onClick={() => openReceita(item)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Enviar receita
                    </button>
                    <button
                      className="p-1.5 text-secondary hover:text-primary hover:bg-teal-50 rounded"
                      onClick={() => {
                        setEditingData(item);
                        setIsEditing(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-on-surface">
                  {item.queixa && (
                    <div>
                      <span className="font-bold text-secondary uppercase text-[10px] tracking-wider block mb-1">Queixa Principal</span>
                      <p className="bg-surface-container-low p-2 rounded">{item.queixa}</p>
                    </div>
                  )}

                  {item.evolucao && (
                    <div>
                      <span className="font-bold text-secondary uppercase text-[10px] tracking-wider block mb-1">Evolução</span>
                      <div
                        className="bg-surface-container-low p-3 rounded prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.evolucao }}
                      />
                    </div>
                  )}

                  {item.conduta && (
                    <div>
                      <span className="font-bold text-secondary uppercase text-[10px] tracking-wider block mb-1">Conduta</span>
                      <p className="bg-surface-container-low p-2 rounded">{item.conduta}</p>
                    </div>
                  )}

                  {item.imagens && item.imagens.length > 0 && (
                    <div>
                      <span className="font-bold text-secondary uppercase text-[10px] tracking-wider block mb-2">
                        Imagens ({item.imagens.length})
                      </span>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {item.imagens.map((url, i) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square overflow-hidden rounded-lg border border-surface-variant transition hover:opacity-80"
                          >
                            <img src={url} alt={`Imagem ${i + 1}`} className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Histórico de acessos LGPD (somente admin) ───────────────────── */}
      {role === "admin" && (
        <div className="rounded-xl border border-outline-variant bg-white shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition rounded-xl"
            onClick={() => void handleToggleAccessLogs()}
          >
            <div className="flex items-center gap-2 text-secondary">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Histórico de acessos (LGPD)
            </div>
            {showAccessLogs ? (
              <ChevronUp className="h-4 w-4 text-secondary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-secondary" />
            )}
          </button>

          {showAccessLogs && (
            <div className="border-t border-outline-variant px-5 pb-4">
              {loadingAccessLogs ? (
                <div className="flex items-center gap-2 py-4 text-sm text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando acessos...
                </div>
              ) : accessLogs.length === 0 ? (
                <p className="py-4 text-sm text-secondary">Nenhum acesso registrado para este paciente.</p>
              ) : (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-left text-xs font-semibold uppercase tracking-wide text-secondary">
                      <th className="pb-2 pr-4">Data / Hora</th>
                      <th className="pb-2 pr-4">Acessado por</th>
                      <th className="pb-2">Perfil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="border-b border-surface-variant last:border-0">
                        <td className="py-2 pr-4 text-ink-muted">
                          {new Date(log.created_at).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-2 pr-4 font-medium text-ink">{log.acessado_por_nome}</td>
                        <td className="py-2 capitalize text-secondary">{log.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Deby AI — Drawer de escuta ───────────────────────────────────── */}
      {showListener && session?.user?.id && (
        <ConsultationListener
          clinicId={clinicId}
          patient={patient}
          currentUserId={session.user.id}
          currentUserName={profile?.nome ?? "Usuário"}
          onDraftReady={(draft) => {
            setShowListener(false);
            setPendingDraft(draft);
          }}
          onClose={() => setShowListener(false)}
        />
      )}

      {/* ── Deby AI — Revisão do rascunho ────────────────────────────────── */}
      {pendingDraft && (
        <ConsultationDraft
          draft={pendingDraft}
          profissionalId={profile?.profissionalId ?? professionals[0]?.id ?? ""}
          onApply={(data) => {
            setPendingDraft(null);
            setEditingData(data);
            setIsEditing(true);
          }}
          onDiscard={() => setPendingDraft(null)}
          onRegenerate={() => {
            setPendingDraft(null);
            setShowListener(true);
          }}
        />
      )}

      {/* ── Modal de envio de receita ─────────────────────────────────────── */}
      {receitaItem !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-variant px-5 py-4">
              <div>
                <h3 className="font-bold text-on-surface">Receita Digital</h3>
                <p className="text-sm text-secondary">
                  {patient.nome} · {patient.whatsapp}
                </p>
              </div>
              <button className="rounded p-1 hover:bg-surface-container-low" onClick={() => { setReceitaItem(null); setEnvioFeedback(null); }}>
                <X className="h-5 w-5 text-secondary" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {envioFeedback && (
                <div className={`rounded-lg px-4 py-2.5 text-sm font-medium ${envioFeedback.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {envioFeedback.msg}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  Conteúdo da receita (edite antes de enviar)
                </label>
                <textarea
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface focus:border-primary focus:outline-none font-mono"
                  rows={10}
                  value={receitaTexto}
                  onChange={(e) => setReceitaTexto(e.target.value)}
                />
              </div>

              <p className="text-xs text-on-surface-variant">
                O WhatsApp interpreta o texto em <strong>*negrito*</strong> automaticamente.
              </p>
            </div>

            <div className="flex flex-wrap justify-between gap-3 border-t border-surface-variant px-5 py-4">
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-container-low transition"
                onClick={handleImprimirPDF}
                type="button"
              >
                <Printer className="h-4 w-4" />
                Baixar / Imprimir PDF
              </button>

              <div className="flex gap-3">
                <button
                  className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-container-low"
                  onClick={() => { setReceitaItem(null); setEnvioFeedback(null); }}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                  disabled={enviando || !patient.whatsapp}
                  onClick={() => void handleEnviarWhatsApp()}
                  type="button"
                >
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar pelo WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
