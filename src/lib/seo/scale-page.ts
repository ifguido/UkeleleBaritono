/**
 * Datos de una página de escala. Mismo criterio que `chord-page`: separado del
 * componente para poder testear las 432 combinaciones sin renderizar nada.
 */

import { Midi } from "@/lib/engine/notes";
import { ParsedChord } from "@/lib/engine/chords";
import { Scale, ScaleNoteName, buildScale } from "@/lib/engine/scales";
import { Progression, harmonizeScale, progressionsFor } from "@/lib/engine/scale-harmony";
import { generateVoicings } from "@/lib/engine/voicings";
import { ScaleRoute, NOTES, SCALE_SLUGS, chordSlug } from "./slugs";

/**
 * Mejor posición de cada acorde, memorizada por cifrado.
 *
 * Sin esto el build recalcularía el mismo acorde una y otra vez: las 432
 * escalas se reparten entre solo 420 acordes distintos, así que la caché
 * convierte varios miles de exploraciones del diapasón en unos cientos.
 */
const voicingCache = new Map<string, Midi[] | null>();

function bestMidiNotes(chord: ParsedChord): Midi[] | null {
  const key = chord.normalized;
  const cached = voicingCache.get(key);
  if (cached !== undefined) return cached;
  const best = generateVoicings(chord)[0]?.midiNotes ?? null;
  voicingCache.set(key, best);
  return best;
}

/** Un acorde listo para pintar: con su enlace y con qué suena al pulsarlo. */
export interface ChordCell {
  symbol: string;
  roman: string;
  /** Slug de su página, o null si la cualidad no tiene una. */
  slug: string | null;
  /** Null cuando el acorde no entra en cuatro cuerdas. */
  midiNotes: Midi[] | null;
}

export interface DegreeRow {
  note: ScaleNoteName;
  triad: ChordCell | null;
  seventh: ChordCell | null;
}

export interface ProgressionStep extends ChordCell {
  bars: number;
}

export interface PlayableProgression {
  name: string;
  note: string;
  chords: ProgressionStep[];
}

export interface ScalePageData {
  scale: Scale;
  /** "La pentatónica menor". Nombre en cifra española, para títulos. */
  spanishName: string;
  /**
   * Armonización por terceras. Viene vacía en las escalas de menos de siete
   * notas: apilar terceras en una pentatónica no da acordes, da otra cosa.
   */
  degrees: DegreeRow[];
  progressions: PlayableProgression[];
}

/**
 * Pide solo los tres campos que necesita, no un `ScaleChord` entero: así sirve
 * igual para los acordes de la armonización y para los de las progresiones, que
 * son tipos distintos con esta parte en común.
 */
function toCell(chord: { symbol: string; roman: string; chord: ParsedChord }): ChordCell {
  return {
    symbol: chord.symbol,
    roman: chord.roman,
    slug: chordSlug(chord.chord.root, chord.chord.quality),
    midiNotes: bestMidiNotes(chord.chord),
  };
}

export function buildScalePage(route: ScaleRoute): ScalePageData | null {
  const scale = buildScale(route.note.engine, route.scale.id);
  if (!scale) return null;

  const degrees: DegreeRow[] = harmonizeScale(scale).map((degree) => ({
    note: degree.note,
    triad: degree.triad ? toCell(degree.triad) : null,
    seventh: degree.seventh ? toCell(degree.seventh) : null,
  }));

  const progressions: PlayableProgression[] = progressionsFor(scale).map(
    (progression: Progression) => {
      return {
        name: progression.name,
        note: progression.note,
        chords: progression.chords.map((chord) => ({ ...toCell(chord), bars: chord.bars })),
      };
    },
  );

  return {
    scale,
    spanishName: `${route.note.es} ${scale.formula.name.toLowerCase()}`,
    degrees,
    progressions,
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
