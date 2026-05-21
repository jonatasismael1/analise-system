import { useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Trash2, X } from "lucide-react";
import { ProntuarioTimeline } from "../../../components/Prontuario/ProntuarioTimeline";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import { brl } from "../../../lib/formatters";
import {
  DEFAULT_INSTANCE_NAME,
  sendWhatsAppText
} from "../../../services/quickActionService";
import type { Patient, Professional, UserRole } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";
import { RefinedTable } from "../components/RefinedTable";
import { StatusPill } from "../components/StatusPill";

const KANBAN_LABEL: Record<string, string> = {
  novo: "Novo",
  agendado: "Agendado",
  atendido: "Atendido",
  retorno: "Retorno",
  faltou: "Faltou",
  inativo: "Inativo"
};

export function PatientsPanel({
  clinicId,
  patients,
  professionals,
  onSave,
  onDelete,
  onImportMassively,
  role
}: {
  readonly clinicId: string;
  readonly patients: Patient[];
  readonly professionals: Professional[];
  readonly onSave: (values: Patient) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onImportMassively: (patients: Omit<Patient, "id" | "clinicaId">[]) => Promise<void>;
  readonly role?: UserRole;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<Patient>({
    id: "",
    nome: "",
    whatsapp: "",
    email: "",
    cpf: "",
    dataNascimento: "",
    endereco: "",
    status: "ativo",
    valorTotalGasto: 0,
    profissionalId: professionals[0]?.id ?? null,
    observacoes: ""
  });
  const [filters, setFilters] = useState({ search: "", status: "todos", professionalId: "todos" });

  // ── Modal envio rápido de WhatsApp ─────────────────────────────────────────
  const [msgPatient, setMsgPatient] = useState<Patient | null>(null);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgFeedback, setMsgFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const readonly = role === "profissional";

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = `${patient.nome} ${patient.whatsapp} ${patient.email ?? ""} ${patient.cpf ?? ""}`.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "todos" || patient.status === filters.status;
    const matchesProfessional = filters.professionalId === "todos" || patient.profissionalId === filters.professionalId;
    return matchesSearch && matchesStatus && matchesProfessional;
  });

  async function handleSendMsg() {
    if (!msgPatient || !msgText.trim()) return;
    setSendingMsg(true);
    setMsgFeedback(null);
    try {
      const phone = msgPatient.whatsapp.replace(/\D/g, "");
      const normalized = phone.startsWith("55") ? phone : `55${phone}`;
      await sendWhatsAppText(DEFAULT_INSTANCE_NAME, normalized, msgText.trim());
      setMsgFeedback({ ok: true, text: "Mensagem enviada com sucesso!" });
      setMsgText("");
    } catch (e) {
      setMsgFeedback({ ok: false, text: e instanceof Error ? e.message : "Erro ao enviar mensagem." });
    } finally {
      setSendingMsg(false);
    }
  }

  if (selectedPatient) {
    return (
      <div className="space-y-4">
        <button
          className="text-sm text-secondary hover:text-primary transition"
          onClick={() => setSelectedPatient(null)}
        >
          ← Voltar para lista de pacientes
        </button>
        <ProntuarioTimeline
          clinicId={clinicId}
          patient={selectedPatient}
          professionals={professionals}
        />
      </div>
    );
  }

  return (
    <SectionCard
      title="Pacientes"
      description={readonly ? "Lista de pacientes sob seus cuidados." : "Dados cadastrais, CPF, endereço, retorno e vínculo com profissional."}
    >
      <div className="mb-4 flex flex-col md:flex-row gap-3 justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-3">
          <Field label="Buscar paciente">
            <input className={inputClass()} placeholder="Nome, WhatsApp, e-mail ou CPF" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className={inputClass()} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="retorno_pendente">Retorno pendente</option>
              <option value="inativo">Inativo</option>
            </select>
          </Field>
          {!readonly ? (
            <Field label="Profissional">
              <select className={inputClass()} value={filters.professionalId} onChange={(e) => setFilters({ ...filters, professionalId: e.target.value })}>
                <option value="todos">Todos</option>
                {professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}
              </select>
            </Field>
          ) : null}
        </div>

        {!readonly ? (
          <div className="flex items-end">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary bg-primary-soft px-4 text-sm font-medium text-primary-dark hover:bg-primary/20 transition">
              Importar CSV
              <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const lines = text.split(/\r?\n/).filter((line) => line.trim());
                const parsed = lines.slice(1).map((line) => {
                  const cols = line.split(/[;,]/).map((c) => c.trim());
                  return {
                    nome: cols[0] || "Sem Nome",
                    cpf: cols[1] || null,
                    whatsapp: cols[2] || "00000000000",
                    dataNascimento: cols[3] || null,
                    endereco: (cols[4] || "") + (cols[5] ? ` - CEP: ${cols[5]}` : ""),
                    email: cols[6] || null,
                    status: "ativo" as const,
                    valorTotalGasto: 0,
                    profissionalId: null,
                    observacoes: "Importado em massa"
                  };
                });
                if (parsed.length > 0 && confirmDangerAction(`Tem certeza que deseja importar ${parsed.length} pacientes? Essa ação não pode ser desfeita automaticamente.`)) {
                  await onImportMassively(parsed);
                }
                e.target.value = "";
              }} />
            </label>
          </div>
        ) : null}
      </div>

      {!readonly ? (
        <form
          ref={formRef}
          className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-8"
          onSubmit={(e) => {
            e.preventDefault();
            void onSave(form);
            setForm({ ...form, id: "", nome: "", whatsapp: "", cpf: "", endereco: "" });
          }}
        >
          <Field label="Nome"><input className={inputClass()} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></Field>
          <Field label="WhatsApp"><input className={inputClass()} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required /></Field>
          <Field label="CPF"><input className={inputClass()} value={form.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
          <Field label="Nascimento"><input className={inputClass()} type="date" value={form.dataNascimento ?? ""} onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })} /></Field>
          <Field label="E-mail"><input className={inputClass()} type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Endereço"><input className={inputClass()} value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></Field>
          <Field label="Status">
            <select className={inputClass()} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Patient["status"] })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="retorno_pendente">Retorno pendente</option>
            </select>
          </Field>
          <Field label="Valor total"><input className={inputClass()} type="number" value={form.valorTotalGasto} onChange={(e) => setForm({ ...form, valorTotalGasto: Number(e.target.value) })} /></Field>
          <Field label="Observações"><input className={inputClass()} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Field>
          <button className="mt-5 h-10 rounded bg-primary px-4 text-sm font-medium text-white" type="submit">Salvar</button>
        </form>
      ) : null}

      {filteredPatients.length === 0 ? (
        <EmptyState title="Nenhum paciente" message="Nenhum paciente encontrado para os filtros aplicados." />
      ) : (
        <RefinedTable headers={readonly
          ? ["Nome", "WhatsApp", "Status", "Fase", ""]
          : ["Nome", "CPF", "WhatsApp", "Endereço", "Status", "Observações", "Total gasto", ""]
        }>
          {filteredPatients.map((patient) => (
            <tr className="border-b border-surface-variant hover:bg-teal-50" key={patient.id}>
              <td className="px-4 py-3 font-medium">{patient.nome}</td>
              {!readonly ? <td className="px-4 py-3">{patient.cpf ?? "-"}</td> : null}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span>{patient.whatsapp}</span>
                  {patient.whatsapp && (
                    <button
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition"
                      title={`Enviar mensagem para ${patient.nome}`}
                      type="button"
                      onClick={() => { setMsgPatient(patient); setMsgText(""); setMsgFeedback(null); }}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
              {!readonly ? <td className="px-4 py-3">{patient.endereco ?? "-"}</td> : null}
              <td className="px-4 py-3"><StatusPill value={patient.status} /></td>
              {readonly ? (
                <td className="px-4 py-3 text-secondary text-sm">
                  {patient.kanbanStage ? (KANBAN_LABEL[patient.kanbanStage] ?? patient.kanbanStage) : "-"}
                </td>
              ) : null}
              {!readonly ? <td className="px-4 py-3">{patient.observacoes ?? "-"}</td> : null}
              {!readonly ? <td className="px-4 py-3 text-right">{brl.format(patient.valorTotalGasto)}</td> : null}
              <td className="px-4 py-3 text-right">
                <button
                  className="mr-2 rounded border border-outline-variant px-2 py-1 text-xs hover:border-primary hover:text-primary transition"
                  onClick={() => setSelectedPatient(patient)}
                  type="button"
                >
                  Prontuário
                </button>
                {!readonly ? (
                  <>
                    <button
                      className="mr-2 rounded border border-outline-variant px-2 py-1 text-xs"
                      onClick={() => {
                        setForm(patient);
                        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      aria-label={`Excluir paciente ${patient.nome}`}
                      onClick={() => {
                        if (confirmDangerAction(`Tem certeza que deseja excluir ${patient.nome}? Essa ação não pode ser desfeita.`)) {
                          void onDelete(patient.id);
                        }
                      }}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </RefinedTable>
      )}

      {/* ── Modal envio rápido WhatsApp ─────────────────────────────────────── */}
      {msgPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="font-bold text-on-surface">Enviar mensagem</h3>
                <p className="text-sm text-on-surface-variant">
                  {msgPatient.nome} · {msgPatient.whatsapp}
                </p>
              </div>
              <button
                className="rounded p-1 hover:bg-surface-container-low"
                type="button"
                onClick={() => { setMsgPatient(null); setMsgFeedback(null); }}
              >
                <X className="h-5 w-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {msgFeedback && (
                <div className={`rounded-lg px-4 py-2.5 text-sm font-medium ${msgFeedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {msgFeedback.text}
                </div>
              )}
              <Field label="Mensagem">
                <textarea
                  className={`${inputClass()} resize-none`}
                  rows={4}
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  placeholder={`Olá, ${msgPatient.nome.split(" ")[0]}! Aqui é da Análise Saúde...`}
                  disabled={sendingMsg}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 border-t border-outline-variant px-5 py-4">
              <button
                className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
                type="button"
                onClick={() => { setMsgPatient(null); setMsgFeedback(null); }}
              >
                Fechar
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1ebe5d] disabled:opacity-50"
                disabled={sendingMsg || !msgText.trim()}
                type="button"
                onClick={() => void handleSendMsg()}
              >
                {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
