import { useState, useRef } from "react";
import { Bold, Italic, List, Check, X } from "lucide-react";

export interface ProntuarioData {
  id?: string;
  queixa: string;
  evolucao: string;
  conduta: string;
  profissionalId: string;
  data?: string;
}

interface ProntuarioEditorProps {
  initialData?: ProntuarioData;
  professionals: { id: string; nome: string }[];
  onSave: (data: ProntuarioData) => void;
  onCancel: () => void;
}

export function ProntuarioEditor({ initialData, professionals, onSave, onCancel }: ProntuarioEditorProps) {
  const [queixa, setQueixa] = useState(initialData?.queixa ?? "");
  const [evolucao, setEvolucao] = useState(initialData?.evolucao ?? "");
  const [conduta, setConduta] = useState(initialData?.conduta ?? "");
  const [profissionalId, setProfissionalId] = useState(initialData?.profissionalId ?? professionals[0]?.id ?? "");

  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSave = () => {
    const content = editorRef.current?.innerHTML ?? evolucao;
    onSave({
      id: initialData?.id,
      queixa,
      evolucao: content,
      conduta,
      profissionalId
    });
  };

  return (
    <div className="rounded-xl border border-surface-variant bg-white p-5 shadow-clinical">
      <div className="mb-4 flex items-center justify-between border-b border-surface-variant pb-4">
        <h3 className="text-lg font-bold text-primary">
          {initialData ? "Editar Evolução" : "Nova Evolução Clínica"}
        </h3>
        <button onClick={onCancel} className="text-secondary hover:text-on-surface p-1">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Profissional */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
            Profissional Responsável
          </label>
          <select
            className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            value={profissionalId}
            onChange={(e) => setProfissionalId(e.target.value)}
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        {/* Queixa */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
            Queixa Principal (S)
          </label>
          <textarea
            className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            rows={2}
            value={queixa}
            onChange={(e) => setQueixa(e.target.value)}
            placeholder="Relato do paciente..."
          />
        </div>

        {/* Evolução (Rich Text) */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
            Evolução (O/A)
          </label>
          <div className="rounded-lg border border-outline-variant overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b border-outline-variant bg-surface-container-low p-1">
              <button onClick={() => execCommand("bold")} className="p-1.5 text-secondary hover:bg-surface-container hover:text-primary rounded" title="Negrito">
                <Bold className="h-4 w-4" />
              </button>
              <button onClick={() => execCommand("italic")} className="p-1.5 text-secondary hover:bg-surface-container hover:text-primary rounded" title="Itálico">
                <Italic className="h-4 w-4" />
              </button>
              <div className="h-4 w-px bg-outline-variant mx-1" />
              <button onClick={() => execCommand("insertUnorderedList")} className="p-1.5 text-secondary hover:bg-surface-container hover:text-primary rounded" title="Lista">
                <List className="h-4 w-4" />
              </button>
            </div>
            {/* Content Editable */}
            <div
              ref={editorRef}
              className="w-full min-h-[120px] p-3 text-sm focus:outline-none prose prose-sm max-w-none"
              contentEditable
              onInput={(e) => setEvolucao(e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: initialData?.evolucao ?? "" }}
            />
          </div>
        </div>

        {/* Conduta */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
            Conduta (P)
          </label>
          <textarea
            className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            rows={2}
            value={conduta}
            onChange={(e) => setConduta(e.target.value)}
            placeholder="Plano terapêutico, prescrições, encaminhamentos..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-surface-container-low"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          onClick={handleSave}
        >
          <Check className="h-4 w-4" />
          Salvar Evolução
        </button>
      </div>
    </div>
  );
}
