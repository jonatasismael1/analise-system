import { useState, useRef } from "react";
import { Bold, Italic, List, Check, X, ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

export interface ProntuarioData {
  id?: string;
  queixa: string;
  evolucao: string;
  conduta: string;
  profissionalId: string;
  data?: string;
  atualizadoEm?: string;
  imagens?: string[];
}

interface ProntuarioEditorProps {
  initialData?: ProntuarioData;
  professionals: { id: string; nome: string }[];
  onSave: (data: ProntuarioData) => void | Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ProntuarioEditor({ initialData, professionals, onSave, onCancel, isSaving = false }: ProntuarioEditorProps) {
  const [queixa, setQueixa] = useState(initialData?.queixa ?? "");
  const [evolucao, setEvolucao] = useState(initialData?.evolucao ?? "");
  const [conduta, setConduta] = useState(initialData?.conduta ?? "");
  const [profissionalId, setProfissionalId] = useState(initialData?.profissionalId ?? professionals[0]?.id ?? "");
  const [imagens, setImagens] = useState<string[]>(initialData?.imagens ?? []);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) { alert("Máximo 10 MB por imagem."); return; }
    setUploadingImg(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `prontuarios/${initialData?.id ?? "novo"}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("prontuarios").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("prontuarios").getPublicUrl(path);
      setImagens((prev) => [...prev, data.publicUrl]);
    } catch {
      alert("Erro ao enviar imagem.");
    } finally {
      setUploadingImg(false);
    }
  }

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSave = () => {
    const content = editorRef.current?.innerHTML ?? evolucao;
    void onSave({
      id: initialData?.id,
      queixa,
      evolucao: content,
      conduta,
      profissionalId,
      imagens,
    });
  };

  return (
    <div className="rounded-xl border border-surface-variant bg-white p-5 shadow-clinical">
      <div className="mb-4 flex items-center justify-between border-b border-surface-variant pb-4">
        <h3 className="text-lg font-bold text-primary">
          {initialData ? "Editar Evolução" : "Nova Evolução Clínica"}
        </h3>
        <button onClick={onCancel} className="text-secondary hover:text-on-surface p-1" disabled={isSaving}>
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
            disabled={isSaving}
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
            disabled={isSaving}
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
              <button onClick={() => execCommand("bold")} className="p-1.5 text-secondary hover:bg-surface-container hover:text-primary rounded disabled:opacity-50" title="Negrito" disabled={isSaving}>
                <Bold className="h-4 w-4" />
              </button>
              <button onClick={() => execCommand("italic")} className="p-1.5 text-secondary hover:bg-surface-container hover:text-primary rounded" title="Itálico">
                <Italic className="h-4 w-4" />
              </button>
              <div className="h-4 w-px bg-outline-variant mx-1" />
              <button onClick={() => execCommand("insertUnorderedList")} className="p-1.5 text-secondary hover:bg-surface-container hover:text-primary rounded disabled:opacity-50" title="Lista" disabled={isSaving}>
                <List className="h-4 w-4" />
              </button>
            </div>
            {/* Content Editable */}
            <div
              ref={editorRef}
              className="w-full min-h-[120px] p-3 text-sm focus:outline-none prose prose-sm max-w-none"
              contentEditable={!isSaving}
              aria-disabled={isSaving}
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

        {/* Imagens do prontuário */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
              Imagens anexadas
            </label>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium text-secondary transition hover:border-primary hover:text-primary disabled:opacity-50"
              disabled={isSaving || uploadingImg}
              onClick={() => imgInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {uploadingImg ? "Enviando..." : "Adicionar imagem"}
            </button>
          </div>
          {imagens.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {imagens.map((url, i) => (
                <div key={url} className="flex flex-col gap-1">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square overflow-hidden rounded-lg border border-outline-variant"
                  >
                    <img src={url} alt={`Imagem ${i + 1}`} className="h-full w-full object-cover" />
                  </a>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 py-1 text-[10px] font-medium text-red-600 transition hover:bg-red-100"
                    onClick={() => setImagens((prev) => prev.filter((u) => u !== url))}
                  >
                    <Trash2 className="h-3 w-3" />
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-3 text-center text-xs text-secondary">
              Nenhuma imagem. Clique em "Adicionar imagem" para anexar fotos, exames ou documentos.
            </p>
          )}
          <input
            ref={imgInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              files.forEach((f) => void handleImageFile(f));
              e.target.value = "";
            }}
          />
        </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-surface-container-low"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className="h-4 w-4" />
          Salvar Evolução
        </button>
      </div>
    </div>
  );
}
