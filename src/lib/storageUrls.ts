import { supabase } from "./supabaseClient";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora

/**
 * Extrai o caminho do objeto dentro de um bucket a partir de uma URL do
 * Supabase Storage. Funciona tanto para URLs públicas antigas (já salvas no
 * banco) quanto para URLs assinadas. Se o valor já for um caminho, retorna-o
 * inalterado.
 *
 * Exemplos:
 *   https://x.supabase.co/storage/v1/object/public/prontuarios/prontuarios/abc/1.jpg
 *     → "prontuarios/abc/1.jpg"
 *   "prontuarios/abc/1.jpg" → "prontuarios/abc/1.jpg"
 */
export function extractObjectPath(bucket: string, urlOrPath: string): string {
  const markers = [
    `/object/public/${bucket}/`,
    `/object/sign/${bucket}/`,
    `/object/authenticated/${bucket}/`,
  ];
  for (const marker of markers) {
    const idx = urlOrPath.indexOf(marker);
    if (idx >= 0) {
      // Remove eventual querystring (?token=...) das URLs assinadas
      return urlOrPath.slice(idx + marker.length).split("?")[0];
    }
  }
  // Não é uma URL conhecida — assume que já é o caminho do objeto
  return urlOrPath;
}

/**
 * Gera uma URL assinada (temporária) para um objeto de um bucket privado.
 * Aceita tanto a URL pública antiga (compatibilidade com dados já salvos)
 * quanto o caminho do objeto.
 */
export async function resolveSignedUrl(bucket: string, urlOrPath: string): Promise<string> {
  const path = extractObjectPath(bucket, urlOrPath);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Não foi possível gerar a URL do arquivo.");
  }
  return data.signedUrl;
}
