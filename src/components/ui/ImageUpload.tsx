import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

interface ImageUploadProps {
  readonly currentUrl?: string | null;
  readonly bucket: "clinic-photos" | "prontuarios";
  readonly path: string; // e.g. "clinicId/professionals/profId"
  readonly onUpload: (url: string) => void;
  readonly onRemove?: () => void;
  readonly shape?: "circle" | "rounded";
  readonly size?: "sm" | "md" | "lg";
  readonly placeholder?: string;
  readonly accept?: string;
}

const SIZE_MAP = {
  sm: { container: "h-12 w-12", icon: "h-4 w-4", text: "text-[10px]" },
  md: { container: "h-20 w-20", icon: "h-5 w-5", text: "text-xs" },
  lg: { container: "h-28 w-28", icon: "h-6 w-6", text: "text-xs" },
};

export function ImageUpload({
  currentUrl,
  bucket,
  path,
  onUpload,
  onRemove,
  shape = "circle",
  size = "md",
  placeholder,
  accept = "image/jpeg,image/png,image/webp",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { container, icon, text } = SIZE_MAP[size];
  const radius = shape === "circle" ? "rounded-full" : "rounded-xl";

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens são permitidas.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Máximo 5 MB.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filename = `${path}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
      onUpload(data.publicUrl);
    } catch (e) {
      setError("Erro ao enviar. Tente novamente.");
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="group relative">
        {/* Preview / placeholder */}
        <div
          className={`${container} ${radius} overflow-hidden border-2 border-dashed border-border bg-surface-low transition ${
            !currentUrl ? "cursor-pointer hover:border-primary hover:bg-primary-wash" : ""
          }`}
          onClick={() => !currentUrl && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          role={!currentUrl ? "button" : undefined}
          tabIndex={!currentUrl ? 0 : undefined}
          onKeyDown={!currentUrl ? (e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); } : undefined}
        >
          {currentUrl ? (
            <img src={currentUrl} alt="Foto" className="h-full w-full object-cover" />
          ) : uploading ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className={`${icon} animate-spin text-primary`} />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
              <Camera className={`${icon} text-ink-muted`} />
              {placeholder && <p className={`${text} text-ink-muted leading-tight`}>{placeholder}</p>}
            </div>
          )}
        </div>

        {/* Overlay buttons when has image */}
        {currentUrl && (
          <div className={`absolute inset-0 ${radius} flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100`}>
            <button
              className="rounded-full bg-white/90 p-1.5 text-ink transition hover:bg-white"
              type="button"
              title="Trocar foto"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            {onRemove && (
              <button
                className="rounded-full bg-white/90 p-1.5 text-error transition hover:bg-white"
                type="button"
                title="Remover foto"
                onClick={onRemove}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Upload indicator when has image */}
        {currentUrl && uploading && (
          <div className={`absolute inset-0 ${radius} flex items-center justify-center bg-black/40`}>
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Click to upload link (when no image) */}
      {!currentUrl && !uploading && (
        <button
          className="text-xs font-medium text-primary hover:underline"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          Carregar foto
        </button>
      )}

      {error && <p className="text-[11px] text-error">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
