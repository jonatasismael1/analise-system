import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ProntuarioTimeline } from "../../../components/Prontuario/ProntuarioTimeline";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import { brl } from "../../../lib/formatters";
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
  patients,
  professionals,
  onSave,
  onDelete,
  onImportMassively,
  role
}: {
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

  const readonly = role === "profissional";

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = `${patient.nome} ${patient.whatsapp} ${patient.email ?? ""} ${patient.cpf ?? ""}`.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "todos" || patient.status === filters.status;
    const matchesProfessional = filters.professionalId === "todos" || patient.profissionalId === filters.professionalId;
    return matchesSearch && matchesStatus && matchesProfessional;
  });

  if (selectedPatient) {
    return (
      <div className="space-y-4">
        <button
          className="text-sm text-secondary hover:text-primary transition"
          onClick={() => setSelectedPatient(null)}
        >
          ← Voltar para lista de pacientes
        </button>
        <ProntuarioTimeline patient={selectedPatient} professionals={professionals} />
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
              <td className="px-4 py-3">{patient.whatsapp}</td>
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
    </SectionCard>
  );
}
