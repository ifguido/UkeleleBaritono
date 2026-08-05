import type { Metadata } from "next";
import { LOCALE, SITE_NAME, absoluteUrl } from "./site";

/** Sufijo de marca. El mismo que la plantilla declarada en el layout raíz. */
export const TITLE_SUFFIX = ` · ${SITE_NAME}`;

/**
 * Longitud máxima de la descripción.
 *
 * Google recorta por ancho en píxeles, no por caracteres, y el corte real ronda
 * los 1000 px. 155 caracteres es el equivalente prudente: lo que se pase de ahí
 * se sustituye por puntos suspensivos en el resultado, y lo que se pierde
 * siempre es el final de la frase, que es donde suele estar la llamada a la
 * acción.
 */
export const MAX_DESCRIPTION = 155;

/**
 * Arma una descripción con lo imprescindible y le añade los complementos que
 * quepan, en orden de importancia.
 *
 * Hace falta porque las descripciones se generan: la de una escala cromática
 * lista doce notas con dobles bemoles y se va a 224 caracteres, mientras que la
 * de una tríada se queda corta. Recortar a ciegas cortaría a mitad de palabra;
 * así se descarta la cláusula entera que no entra y la frase sigue leyéndose.
 */
export function fitDescription(essential: string, ...optional: string[]): string {
  let text = essential;
  for (const extra of optional) {
    const candidate = `${text} ${extra}`;
    if (candidate.length <= MAX_DESCRIPTION) text = candidate;
  }
  return text.length <= MAX_DESCRIPTION
    ? text
    : `${text.slice(0, MAX_DESCRIPTION - 1).replace(/[\s,;:–-]+\S*$/, "")}…`;
}

/**
 * Imagen de compartido por defecto, servida por `app/opengraph-image.tsx`.
 *
 * Hay que nombrarla explícitamente. La intuición dice que la imagen del
 * segmento raíz cascadea sola a las rutas hijas, y así es… hasta que una página
 * declara su propio bloque `openGraph`: ese bloque no se fusiona con el del
 * layout, lo reemplaza entero, y se lleva la imagen con él. El resultado son
 * páginas que comparten sin miniatura, que es justo lo que mata el clic cuando
 * alguien pasa el enlace por WhatsApp.
 */
const DEFAULT_OG_IMAGE = "/opengraph-image";

interface PageMetaInput {
  /** Sin la marca: se agrega sola, salvo que `absoluteTitle` diga lo contrario. */
  title: string;
  description: string;
  /** Ruta interna. De acá salen el canonical y la og:url. */
  path: string;
  /** Ruta de la imagen de compartido, si la página genera la suya. */
  image?: string;
  /** Para títulos que ya contienen la marca y no deben repetirla. */
  absoluteTitle?: boolean;
  /** Para páginas que existen pero no queremos en el índice. */
  noindex?: boolean;
}

/**
 * Constructor único de metadatos de página.
 *
 * Existe por dos motivos. Uno: que ninguna página pueda publicarse sin
 * canonical, que con ~900 URLs generadas es la única defensa real contra que
 * dos rutas compitan por la misma consulta. Dos: el bloque `openGraph` se
 * reemplaza entero cuando una página lo declara —no se fusiona con el del
 * layout—, así que el título social se arma acá completo, con marca incluida,
 * en vez de confiar en heredar una plantilla que el reemplazo se lleva puesta.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  absoluteTitle,
  noindex,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = absoluteTitle ? title : `${title}${TITLE_SUFFIX}`;
  const images = [{ url: image, width: 1200, height: 630, alt: fullTitle }];
  // Red de seguridad: aunque cada página debería entregar una descripción que
  // ya quepa, con ~900 páginas conviene que el límite se aplique en el único
  // sitio por el que pasan todas.
  const summary = fitDescription(description);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: summary,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      locale: LOCALE,
      title: fullTitle,
      description: summary,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: summary,
      images,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
