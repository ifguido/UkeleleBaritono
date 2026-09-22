import { IMPORT_ENDPOINT } from "@/lib/config";

export const IMPORT_FALLBACK =
  "No pude importar esa página automáticamente. Copiá el texto de la canción y pegalo acá: la entrada manual siempre funciona.";

export function looksLikeUrl(text: string): boolean {
  return /^https?:\/\/\S+$/.test(text.trim());
}

/**
 * Importa una canción desde una URL usando el servidor de la web. El
 * scraping vive allá a propósito: cuando un sitio cambia su HTML se
 * arregla en el servidor, sin esperar una versión nueva de la app.
 */
export async function importSongFromUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(IMPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    const data = (await res.json()) as { text?: string; error?: string };
    if (!res.ok || !data.text) throw new Error(data.error ?? IMPORT_FALLBACK);
    return data.text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("La página tardó demasiado en responder. " + IMPORT_FALLBACK);
    }
    if (error instanceof TypeError) {
      // fetch falla con TypeError cuando no hay red
      throw new Error("Sin conexión: para importar desde una URL hace falta internet. " + IMPORT_FALLBACK);
    }
    throw error instanceof Error ? error : new Error(IMPORT_FALLBACK);
  } finally {
    clearTimeout(timer);
  }
}
