/**
 * Datos de una página de escala. Mismo criterio que `chord-page`: separado del
 * componente para poder testear las 432 combinaciones sin renderizar nada.
 */

import { Scale, buildScale } from "@/lib/engine/scales";
import { HarmonizedDegree, Progression, harmonizeScale, progressionsFor } from "@/lib/engine/scale-harmony";
import { ScaleRoute, NOTES, SCALE_SLUGS } from "./slugs";

export interface ScalePageData {
  scale: Scale;
  /** "La pentatónica menor". Nombre en cifra española, para títulos. */
  spanishName: string;
  /**
   * Armonización por terceras. Viene vacía en las escalas de menos de siete
   * notas: apilar terceras en una pentatónica no da acordes, da otra cosa.
   */
  degrees: HarmonizedDegree[];
  progressions: Progression[];
}

export function buildScalePage(route: ScaleRoute): ScalePageData | null {
  const scale = buildScale(route.note.engine, route.scale.id);
  if (!scale) return null;

  return {
    scale,
    spanishName: `${route.note.es} ${scale.formula.name.toLowerCase()}`,
    degrees: harmonizeScale(scale),
    progressions: progressionsFor(scale),
  };
}

/** Todas las rutas de escala, para `generateStaticParams`. */
export function everyScaleRoute(): ScaleRoute[] {
  return NOTES.flatMap((note) =>
    SCALE_SLUGS.map((scale) => ({
      note,
      scale,
      canonical: `${note.slug}-${scale.slug}`,
    })),
  );
}
