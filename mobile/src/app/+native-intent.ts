import { getShareExtensionKey } from "expo-share-intent";

/**
 * Cuando el sistema abre la app con un enlace, Expo Router pregunta acá a
 * qué ruta ir. La extensión de compartir de iOS la abre con
 * `ukelelebaritono://dataUrl=<clave>`: eso no es una pantalla, es "hay algo
 * compartido esperando", y quien lo procesa es la pestaña Canción.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return "/cancion";
    return path;
  } catch {
    return "/cancion";
  }
}
