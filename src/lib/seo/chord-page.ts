/**
 * Datos de una página de acorde.
 *
 * Vive aparte del componente por dos razones: se puede testear sin renderizar
 * nada, y `generateMetadata` y la página lo arman con el mismo argumento en vez
 * de duplicar la construcción del cifrado.
 */

import { FORMULAS, ParsedChord, parseChord } from "@/lib/engine/chords";
import { Voicing, generateVoicings } from "@/lib/engine/voicings";
import { PC_NAMES_FLAT, PC_NAMES_SHARP } from "@/lib/engine/notes";
import { ChordRoute, NOTES, QUALITIES } from "./slugs";

/**
 * Cuántas posiciones se muestran. Un acorde común tiene decenas de digitaciones
 * válidas y volcarlas todas no ayuda: las de más abajo son variaciones mínimas
 * de las de arriba. Ocho cubre las formas realmente distintas, y el explorador
 * queda para quien quiera el listado completo.
 */
const MAX_VOICINGS = 8;

export interface ChordPageData {
  /** Cifrado americano normalizado, ej. "C#m7". */
  symbol: string;
  /** Nombre en español, ej. "Do♯ menor séptima". */
  spanishName: string;
  chord: ParsedChord;
  voicings: Voicing[];
  /** Notas del acorde con su grado, en el orden de la fórmula. */
  tones: { note: string; degree: string }[];
}

/** Cifrado que entiende el parser: fundamental + sufijo canónico de la fórmula. */
export function chordSymbol(route: ChordRoute): string {
  return `${route.note.engine}${FORMULAS[route.quality.id].suffix}`;
}

export function buildChordPage(route: ChordRoute): ChordPageData | null {
  const parsed = parseChord(chordSymbol(route));
  if (!parsed.ok) return null;

  const chord = parsed.chord;
  const names = chord.useFlats ? PC_NAMES_FLAT : PC_NAMES_SHARP;

  return {
    symbol: chord.normalized,
    spanishName: `${route.note.es} ${route.quality.es}`,
    chord,
    voicings: generateVoicings(chord).slice(0, MAX_VOICINGS),
    tones: chord.formula.intervals.map((interval) => ({
      note: names[(chord.root + interval.semitones) % 12],
      degree: interval.label,
    })),
  };
}

/** Todas las rutas de acorde, para `generateStaticParams`. */
export function everyChordRoute(): ChordRoute[] {
  return NOTES.flatMap((note) =>
    QUALITIES.map((quality) => ({
      note,
      quality,
      canonical: `${note.slug}-${quality.slug}`,
    })),
  );
}
