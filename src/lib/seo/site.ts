/**
 * Configuración central de SEO. Todo lo que dependa del dominio sale de acá:
 * si mañana cambia, se cambia en un solo lugar y sitemap, canonicals, OG y
 * JSON-LD siguen coherentes entre sí.
 */

/** Dominio canónico. Es el que se indexa; todo lo demás son copias. */
const CANONICAL_ORIGIN = "https://ukelelebaritone.com";

/**
 * URL absoluta del sitio, sin barra final.
 *
 * Se resuelve al dominio canónico salvo que se pida otro explícitamente. La
 * tentación era caer en `VERCEL_PROJECT_PRODUCTION_URL` cuando existiera, pero
 * esa variable devuelve el `.vercel.app` mientras el dominio propio no esté
 * asignado a producción, y el fallo sería silencioso: el sitio compila, se
 * despliega, y publica 858 canonicals apuntando al dominio equivocado.
 *
 * Que los previews hereden el canonical de producción es correcto: no deben
 * indexarse, y así no compiten con el sitio real por las mismas consultas.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? CANONICAL_ORIGIN).replace(/\/+$/, "");

export const SITE_NAME = "Ukelele Barítono";

/** Marca larga, para og:site_name y JSON-LD. */
export const SITE_TITLE = "Ukelele Barítono — acordes, escalas y afinador";

export const SITE_DESCRIPTION =
  "Acordes, escalas, afinador y adaptador de canciones para ukelele barítono (D–G–B–E). " +
  "Cada posición se calcula y se verifica nota por nota: nada de tablas copiadas.";

export const LOCALE = "es_ES";

/** Afinación de referencia, repetida en metadatos y structured data. */
export const TUNING_LABEL = "D–G–B–E";

/** Devuelve una URL absoluta a partir de una ruta interna ("/acordes"). */
export function absoluteUrl(path = "/"): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}
