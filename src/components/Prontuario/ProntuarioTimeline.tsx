import { useState } from "react";
import { FileText, Plus, Clock, Edit2, Send, X } from "lucide-react";
import { ProntuarioEditor, type ProntuarioData } from "./ProntuarioEditor";
import type { Patient, Professional } from "../../types/clinic";

interface ProntuarioTimelineProps {
  patient: Patient;
  professionals: Professional[];
}

function formatWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Adiciona código do Brasil se não começar com 55
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

function buildReceita(patient: Patient, professional: Professional | undefined, item: ProntuarioData): string {
  const data = new Date(item.data ?? new Date()).toLocaleDateString("pt-BR", { dateStyle: "long" });
  const profNome = professional?.nome ?? "Profissional";
  const profRegistro = professional?.registro ? `\nCRM/Registro: ${professional.registro}` : "";

  const linhas: string[] = [
    `*RECEITA MÉDICA*`,
    ``,
    `Paciente: ${patient.nome}`,
    `Data: ${data}`,
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

  linhas.push(`---`);
  linhas.push(`${profNome}${profRegistro}`);

  return linhas.join("\n");
}

export function ProntuarioTimeline({ patient, professionals }: ProntuarioTimelineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<ProntuarioData | null>(null);
  const [receitaItem, setReceitaItem] = useState<ProntuarioData | null>(null);
  const [receitaTexto, setReceitaTexto] = useState("");

  const [historico, setHistorico] = useState<ProntuarioData[]>([
    {
      id: "1",
      queixa: "Paciente relata dores na região lombar após esforço físico.",
      evolucao: "<p>Realizada avaliação física. Musculatura paravertebral tensa. Teste de Lasegue negativo.</p><ul><li>Mobilidade reduzida</li><li>Dor à palpação</li></ul>",
      conduta: "Prescrição de analgésico e encaminhamento para fisioterapia.",
      profissionalId: professionals[0]?.id ?? "",
      data: new Date().toISOString()
    }
  ]);

  const handleSave = (data: ProntuarioData) => {
    if (data.id) {
      setHistorico(historico.map((h) => h.id === data.id ? { ...h, ...data, data: h.data } : h));
    } else {
      setHistorico([{ ...data, id: Date.now().toString(), data: new Date().toISOString() }, ...historico]);
    }
    setIsEditing(false);
    setEditingData(null);
  };

  function openReceita(item: ProntuarioData) {
    const professional = professionals.find((p) => p.id === item.profissionalId);
    setReceitaTexto(buildReceita(patient, professional, item));
    setReceitaItem(item);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Prontuário Clínico</h2>
          <p className="text-sm text-secondary">Paciente: {patient.nome}</p>
        </div>
        {!isEditing && (
          <button
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition"
            onClick={() => setIsEditing(true)}
          >
            <Plus className="h-4 w-4" />
            Nova Evolução
          </button>
        )}
      </div>

      {isEditing && (
        <ProntuarioEditor
          initialData={editingData ?? undefined}
          professionals={professionals}
          onSave={handleSave}
          onCancel={() => {
            setIsEditing(false);
            setEditingData(null);
          }}
        />
      )}

      <div className="relative border-l-2 border-surface-variant ml-4 pl-6 space-y-8">
        {historico.length === 0 ? (
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
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de envio de receita */}
      {receitaItem !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-variant px-5 py-4">
              <div>
                <h3 className="font-bold text-on-surface">Enviar receita via WhatsApp</h3>
                <p className="text-sm text-secondary">Paciente: {patient.nome} · {patient.whatsapp}</p>
              </div>
              <button className="rounded p-1 hover:bg-surface-container-low" onClick={() => setReceitaItem(null)}>
                <X className="h-5 w-5 text-secondary" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  Conteúdo da receita (edite antes de enviar)
                </label>
                <textarea
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface focus:border-primary focus:outline-none"
                  rows={10}
                  value={receitaTexto}
                  onChange={(e) => setReceitaTexto(e.target.value)}
                />
              </div>

              <div className="flex justify-between gap-3">
                <button
                  className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-container-low"
                  onClick={() => setReceitaItem(null)}
                >
                  Cancelar
                </button>
                <a
                  href={`https://wa.me/${formatWhatsApp(patient.whatsapp)}?text=${encodeURIComponent(receitaTexto)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
                  onClick={() => setReceitaItem(null)}
                >
                  <Send className="h-4 w-4" />
                  Abrir no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
