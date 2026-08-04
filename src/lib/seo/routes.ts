/**
 * Las rutas fijas del sitio, en un solo lugar.
 *
 * La navegación, las migas y el sitemap leen de acá. Cuando cada uno tenía su
 * propia lista, era cuestión de tiempo que apareciera una página enlazada pero
 * ausente del sitemap (o al revés), que es de los errores de SEO más caros y
 * más difíciles de ver a ojo.
 */

export interface SiteRoute {
  path: string;
  /** Texto del menú. Corto a propósito. */
  nav: string;
  /** Nombre completo, para migas y listados. */
  name: string;
  /** Una línea sobre para qué sirve, reutilizada en los hubs. */
  blurb: string;
  priority: number;
}

export const TOOL_ROUTES: SiteRoute[] = [
  {
    path: "/",
    nav: "Canción",
    name: "Adaptador de canciones",
    blurb:
      "Pegá una canción con acordes y te la devuelvo con posiciones de barítono cómodas y verificadas.",
    priority: 1,
  },
  {
    path: "/acordes",
    nav: "Acordes",
    name: "Diccionario de acordes",
    blurb:
      "Las 420 combinaciones de acorde para ukelele barítono, con todas sus digitaciones y el diagrama de cada una.",
    priority: 0.9,
  },
  {
    path: "/escalas",
    nav: "Escalas",
    name: "Escalas y modos",
    blurb:
      "36 escalas en las 12 tonalidades, con diapasón, digitaciones, acordes propios y progresiones.",
    priority: 0.9,
  },
  {
    path: "/explorador",
    nav: "Explorador",
    name: "Explorador de acordes",
    blurb: "Buscá un acorde por cifrado y compará todas sus posiciones ordenadas por dificultad.",
    priority: 0.8,
  },
  {
    path: "/identificador",
    nav: "Identificador",
    name: "Identificador de digitaciones",
    blurb: "Escribí los trastes que estás pisando y te digo qué acorde es.",
    priority: 0.8,
  },
  {
    path: "/afinador",
    nav: "Afinador",
    name: "Afinador por micrófono",
    blurb: "Afiná el barítono a D–G–B–E con el micrófono, cuerda por cuerda o en modo cromático.",
    priority: 0.8,
  },
];

export const ROUTE_BY_PATH = new Map(TOOL_ROUTES.map((r) => [r.path, r]));
