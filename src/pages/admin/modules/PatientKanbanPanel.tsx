import { useState } from "react";
import { SectionCard } from "../../../components/ui/SectionCard";
import { brl, todayISO } from "../../../lib/formatters";
import type { Appointment, Patient, Professional } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";

export function PatientKanbanPanel({ patients, appointments, professionals, onSave }: { readonly patients: Patient[]; readonly appointments: Appointment[]; readonly professionals: Professional[]; readonly onSave: (values: Patient) => Promise<void> }) {
  type KanbanStage = NonNullable<Patient["kanbanStage"]>;
  const [filters, setFilters] = useState({ search: "", professionalId: "todos" });
  const [draggedPatientId, setDraggedPatientId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanStage | null>(null);
  const today = todayISO();
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = `${patient.nome} ${patient.whatsapp} ${patient.email ?? ""}`.toLowerCase().includes(filters.search.toLowerCase());
    const matchesProfessional = filters.professionalId === "todos" || patient.profissionalId === filters.professionalId;
    return matchesSearch && matchesProfessional;
  });
  const columns: Array<{ id: KanbanStage; title: string; help: string; accent: string }> = [
    { id: "novo", title: "Novo lead", help: "Ainda sem consulta registrada.", accent: "border-t-sky-400" },
    { id: "agendado", title: "Agendado", help: "Consulta futura pendente ou confirmada.", accent: "border-t-indigo-400" },
    { id: "atendido", title: "Atendido", help: "Já realizou consulta e pode virar retorno.", accent: "border-t-emerald-400" },
    { id: "retorno", title: "Retorno pendente", help: "Na janela de contato para voltar.", accent: "border-t-amber-400" },
    { id: "faltou", title: "Faltou", help: "Precisa de recuperação ativa.", accent: "border-t-rose-400" },
    { id: "inativo", title: "Inativo", help: "Sem movimento recente.", accent: "border-t-slate-400" }
  ];

  function stageFor(patient: Patient): KanbanStage {
    if (patient.kanbanStage) return patient.kanbanStage;
    const patientAppointments = appointments.filter((appointment) => appointment.pacienteNome === patient.nome);
    if (patientAppointments.some((appointment) => appointment.status === "faltou")) return "faltou";
    if (patient.status === "inativo") return "inativo";
    if (patient.status === "retorno_pendente" || (patient.proximoRetorno && patient.proximoRetorno <= today)) return "retorno";
    if (patientAppointments.some((appointment) => appointment.data >= today && ["pendente", "confirmado"].includes(appointment.status))) return "agendado";
    if (patientAppointments.some((appointment) => ["concluido", "confirmado"].includes(appointment.status)) || patient.ultimoAtendimento) return "atendido";
    return "novo";
  }

  function nextAction(patient: Patient, stage: KanbanStage) {
    if (stage === "agendado") return "Confirmar presença 24h antes da consulta.";
    if (stage === "faltou") return "Enviar mensagem de recuperação e oferecer novo horário.";
    if (stage === "retorno") return `Entrar em contato para retorno${patient.proximoRetorno ? ` em ${patient.proximoRetorno}` : ""}.`;
    if (stage === "atendido") return "Definir data de retorno e registrar observações.";
    if (stage === "inativo") return "Campanha de reativação por WhatsApp.";
    return "Completar cadastro e conduzir para agendamento.";
  }

  async function movePatient(patient: Patient, stage: KanbanStage) {
    const nextStatus: Patient["status"] = stage === "inativo" ? "inativo" : stage === "retorno" ? "retorno_pendente" : "ativo";
    await onSave({
      ...patient,
      status: nextStatus,
      kanbanStage: stage,
      proximoRetorno: stage === "retorno" ? patient.proximoRetorno ?? today : patient.proximoRetorno,
      ultimoAtendimento: stage === "atendido" ? patient.ultimoAtendimento ?? today : patient.ultimoAtendimento
    });
  }

  function handleDrop(stage: KanbanStage) {
    const patient = filteredPatients.find((item) => item.id === draggedPatientId);
    setDraggedPatientId(null);
    setDropTarget(null);
    if (!patient || stageFor(patient) === stage) return;
    void movePatient(patient, stage);
  }

  return (
    <SectionCard title="Kanban de Pacientes" description="Acompanhe cada paciente por etapa e mova o card quando a situação mudar.">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_260px]">
        <Field label="Buscar"><input className={inputClass()} placeholder="Nome, WhatsApp ou e-mail" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
        <Field label="Profissional"><select className={inputClass()} value={filters.professionalId} onChange={(event) => setFilters({ ...filters, professionalId: event.target.value })}><option value="todos">Todos</option>{professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
      </div>
      {/* Kanban horizontal com scroll */}
      <div className="-mx-1 overflow-x-auto pb-3 snap-x">
        <div className="flex gap-3 px-1" style={{ minWidth: `${columns.length * 292}px` }}>
          {columns.map((column) => {
            const items = filteredPatients.filter((patient) => stageFor(patient) === column.id);
            return (
              <section
                className={`flex w-[280px] shrink-0 snap-start flex-col rounded-xl border border-t-4 bg-surface-container-low transition ${column.accent} ${dropTarget === column.id ? "border-primary bg-primary/5 shadow-modal" : "border-surface-variant"}`}
                onDragLeave={() => setDropTarget(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropTarget(column.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(column.id);
                }}
                key={column.id}
              >
                {/* Cabeçalho fixo da coluna */}
                <div className="border-b border-surface-variant px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-on-surface">{column.title}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-secondary border border-surface-variant">{items.length}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-secondary">{column.help}</p>
                </div>
                {/* Cards da coluna */}
                <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 520 }}>
                  {items.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-outline-variant bg-white/60">
                      <p className="text-[11px] font-medium text-secondary">Solte pacientes aqui</p>
                    </div>
                  ) : (
                    items.map((patient) => {
                      const professionalName = professionals.find((professional) => professional.id === patient.profissionalId)?.nome ?? "Sem vínculo";
                      const nextReturn = patient.proximoRetorno ? new Date(`${patient.proximoRetorno}T12:00:00`).toLocaleDateString("pt-BR") : "Não definido";
                      const notes = patient.observacoes ? `${patient.observacoes.slice(0, 80)}${patient.observacoes.length > 80 ? "..." : ""}` : "Sem observação";
                      return (
                        <article
                          className={`cursor-grab rounded-lg border border-outline-variant bg-white p-3 shadow-clinical transition active:cursor-grabbing ${draggedPatientId === patient.id ? "scale-[0.98] opacity-60 ring-2 ring-primary/25" : "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-modal"}`}
                          draggable
                          key={patient.id}
                          onDragEnd={() => {
                            setDraggedPatientId(null);
                            setDropTarget(null);
                          }}
                          onDragStart={(event) => {
                            setDraggedPatientId(patient.id);
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", patient.id);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-on-surface">{patient.nome}</p>
                              <p className="mt-0.5 text-xs text-secondary">{patient.whatsapp}</p>
                            </div>
                            <span className="rounded-full border border-outline-variant px-2 py-0.5 text-[10px] font-semibold text-secondary">{brl.format(patient.valorTotalGasto)}</span>
                          </div>
                          <dl className="mt-3 space-y-1 rounded-md bg-surface-container-low px-2 py-2 text-[11px] text-secondary">
                            <div><dt className="inline font-semibold text-on-surface-variant">Profissional: </dt><dd className="inline">{professionalName}</dd></div>
                            <div><dt className="inline font-semibold text-on-surface-variant">Próximo retorno: </dt><dd className="inline">{nextReturn}</dd></div>
                            <div><dt className="inline font-semibold text-on-surface-variant">Observação: </dt><dd className="inline">{notes}</dd></div>
                          </dl>
                          <p className="mt-2 text-[11px] leading-snug text-on-surface-variant">{nextAction(patient, column.id)}</p>
                          <div className="mt-3 space-y-2">
                            <select className="w-full rounded-md border border-outline-variant bg-white px-2 py-1.5 text-[11px] font-medium text-secondary outline-none focus:border-primary" value={column.id} onChange={(event) => void movePatient(patient, event.target.value as KanbanStage)}>
                              {columns.map((stage) => <option value={stage.id} key={stage.id}>Mover para: {stage.title}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-1.5">
                              {column.id !== "retorno" ? <button className="rounded-md border border-outline-variant px-2 py-1 text-[11px] font-medium hover:border-primary hover:text-primary transition" onClick={() => void movePatient(patient, "retorno")} type="button">Retorno</button> : null}
                              {column.id !== "inativo" ? <button className="rounded-md border border-outline-variant px-2 py-1 text-[11px] font-medium hover:border-red-300 hover:text-error transition" onClick={() => void movePatient(patient, "inativo")} type="button">Inativar</button> : null}
                              {patient.status !== "ativo" ? <button className="col-span-2 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-white hover:bg-primary-dark transition" onClick={() => void movePatient(patient, "novo")} type="button">Reativar</button> : null}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}
