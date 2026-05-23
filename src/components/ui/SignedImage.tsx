import { useEffect, useState } from "react";
import { resolveSignedUrl } from "../../lib/storageUrls";

interface SignedImageProps {
  /** Bucket privado onde o objeto está (ex.: "prontuarios"). */
  readonly bucket: string;
  /** URL pública antiga OU caminho do objeto. */
  readonly source: string;
  readonly alt: string;
  /** Classe do link (<a>) que envolve a imagem. */
  readonly linkClassName?: string;
  /** Classe da <img> e dos estados de carregamento/erro. */
  readonly imgClassName?: string;
}

/**
 * Renderiza uma imagem de um bucket PRIVADO do Supabase Storage gerando uma URL
 * assinada sob demanda. Compatível com URLs públicas já salvas no banco (extrai
 * o caminho do objeto automaticamente). Abre a imagem em nova aba ao clicar.
 */
export function SignedImage({ bucket, source, alt, linkClassName, imgClassName }: SignedImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);

    resolveSignedUrl(bucket, source)
      .then((signed) => { if (active) setUrl(signed); })
      .catch(() => { if (active) setFailed(true); });

    return () => { active = false; };
  }, [bucket, source]);

  if (failed) {
    return (
      <div className={`${imgClassName ?? ""} flex items-center justify-center bg-surface-container-low text-[10px] text-secondary`}>
        indisponível
      </div>
    );
  }

  if (!url) {
    return <div className={`${imgClassName ?? ""} animate-pulse bg-surface-container-low`} />;
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
      <img src={url} alt={alt} className={imgClassName} />
    </a>
  );
}
