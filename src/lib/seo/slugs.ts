/**
 * Slugs en español para las páginas de acordes y escalas.
 *
 * Estas URLs son permanentes: una vez indexadas, cambiarlas cuesta posiciones.
 * Por eso el mapeo está escrito a mano y no se deriva de los nombres del motor
 * (que cambian cuando se ajusta un texto de la interfaz).
 *
 * Reglas de la casa:
 * - La nota va en cifra española ("do", "fa-sostenido"): es como se busca en
 *   castellano, y deja la keyword dentro de la propia URL.
 * - De cada par enarmónico hay una sola URL canónica; la otra grafía existe
 *   como alias y redirige, para no competir contra nosotros mismos.
 * - El sostenido se escribe "s" dentro de los sufijos de acorde ("7s9"), porque
 *   "#" abre el fragmento de la URL y nunca llegaría al servidor.
 */

import { PitchClass } from "@/lib/engine/notes";
import { FORMULAS } from "@/lib/engine/chords";
import { SCALES } from "@/lib/engine/scales";

/* ────────────────────────────── Notas ────────────────────────────── */

export interface NoteMeta {
  pc: PitchClass;
  /** Segmento canónico de URL. */
  slug: string;
  /** Cifra española para títulos y encabezados. */
  es: string;
  /** Cifra americana, la que se usa en las tablaturas. */
  letter: string;
  /** Nombre que entiende el motor (parseNoteName / buildScale). */
  engine: string;
  /** Grafías enarmónicas que redirigen a la canónica. */
  aliases: string[];
}

/**
 * Grafía canónica por pitch class. Se eligió la que usan las cifras de acordes
 * reales (C♯, E♭, F♯, A♭, B♭) en lugar de una regla teórica uniforme.
 */
export const NOTES: NoteMeta[] = [
  { pc: 0, slug: "do", es: "Do", letter: "C", engine: "C", aliases: [] },
  { pc: 1, slug: "do-sostenido", es: "Do♯", letter: "C#", engine: "C#", aliases: ["re-bemol"] },
  { pc: 2, slug: "re", es: "Re", letter: "D", engine: "D", aliases: [] },
  { pc: 3, slug: "mi-bemol", es: "Mi♭", letter: "Eb", engine: "Eb", aliases: ["re-sostenido"] },
  { pc: 4, slug: "mi", es: "Mi", letter: "E", engine: "E", aliases: ["fa-bemol"] },
  { pc: 5, slug: "fa", es: "Fa", letter: "F", engine: "F", aliases: ["mi-sostenido"] },
  { pc: 6, slug: "fa-sostenido", es: "Fa♯", letter: "F#", engine: "F#", aliases: ["sol-bemol"] },
  { pc: 7, slug: "sol", es: "Sol", letter: "G", engine: "G", aliases: [] },
  { pc: 8, slug: "la-bemol", es: "La♭", letter: "Ab", engine: "Ab", aliases: ["sol-sostenido"] },
  { pc: 9, slug: "la", es: "La", letter: "A", engine: "A", aliases: [] },
  { pc: 10, slug: "si-bemol", es: "Si♭", letter: "Bb", engine: "Bb", aliases: ["la-sostenido"] },
  { pc: 11, slug: "si", es: "Si", letter: "B", engine: "B", aliases: ["do-bemol"] },
];

export const NOTE_BY_PC = new Map<PitchClass, NoteMeta>(NOTES.map((n) => [n.pc, n]));

/**
 * Índice de todas las grafías (canónicas y alias) ordenado de más larga a más
 * corta. El orden importa: "mi-bemol-menor" tiene que resolver contra
 * "mi-bemol" y no contra "mi".
 */
const NOTE_LOOKUP: { text: string; note: NoteMeta }[] = NOTES.flatMap((note) =>
  [note.slug, ...note.aliases].map((text) => ({ text, note })),
).sort((a, b) => b.text.length - a.text.length);

/** Separa el prefijo de nota de un slug. Devuelve la nota y lo que sobra. */
function splitNote(slug: string): { note: NoteMeta; rest: string; canonical: boolean } | null {
  for (const { text, note } of NOTE_LOOKUP) {
    if (slug === text) return { note, rest: "", canonical: text === note.slug };
    if (slug.startsWith(`${text}-`)) {
      return { note, rest: slug.slice(text.length + 1), canonical: text === note.slug };
    }
  }
  return null;
}

/* ───────────────────────── Cualidades de acorde ───────────────────────── */

export interface QualityMeta {
  /** Clave en FORMULAS. */
  id: string;
  slug: string;
  /** Nombre corto en español, para títulos y H1. */
  es: string;
  aliases: string[];
}

/**
 * Ojo con los alias: la búsqueda es insensible a mayúsculas porque las URLs se
 * normalizan a minúsculas, así que "M" y "m" son el mismo alias. Por eso el
 * mayor no reclama "M" ni el maj7 reclama "M7": chocarían con menor y m7.
 */
export const QUALITIES: QualityMeta[] = [
  { id: "major", slug: "mayor", es: "mayor", aliases: ["may"] },
  { id: "minor", slug: "menor", es: "menor", aliases: ["m", "min"] },
  { id: "dim", slug: "disminuido", es: "disminuido", aliases: ["dim"] },
  { id: "aug", slug: "aumentado", es: "aumentado", aliases: ["aug"] },
  { id: "sus2", slug: "sus2", es: "suspendido 2ª", aliases: [] },
  { id: "sus4", slug: "sus4", es: "suspendido 4ª", aliases: ["sus"] },
  { id: "5", slug: "power-chord", es: "power chord (quinta)", aliases: ["5", "quinta"] },
  { id: "6", slug: "6", es: "sexta", aliases: ["sexta"] },
  { id: "m6", slug: "m6", es: "menor sexta", aliases: ["menor-sexta"] },
  { id: "69", slug: "6-9", es: "sexta con novena", aliases: ["69"] },
  { id: "7", slug: "7", es: "séptima dominante", aliases: ["dom7", "septima"] },
  { id: "maj7", slug: "maj7", es: "séptima mayor", aliases: ["7maj", "septima-mayor"] },
  { id: "m7", slug: "m7", es: "menor séptima", aliases: ["min7", "menor-septima"] },
  { id: "mMaj7", slug: "m-maj7", es: "menor con séptima mayor", aliases: ["mmaj7", "minmaj7"] },
  { id: "m7b5", slug: "m7b5", es: "semidisminuido", aliases: ["semidisminuido", "min7b5"] },
  { id: "dim7", slug: "dim7", es: "disminuido séptima", aliases: ["disminuido-7"] },
  { id: "add9", slug: "add9", es: "con novena añadida", aliases: ["9add"] },
  { id: "madd9", slug: "m-add9", es: "menor con novena añadida", aliases: ["madd9"] },
  { id: "add4", slug: "add4", es: "con cuarta añadida", aliases: [] },
  { id: "add11", slug: "add11", es: "con oncena añadida", aliases: [] },
  { id: "9", slug: "9", es: "novena dominante", aliases: ["dom9", "novena"] },
  { id: "maj9", slug: "maj9", es: "novena mayor", aliases: [] },
  { id: "m9", slug: "m9", es: "menor novena", aliases: ["min9"] },
  { id: "11", slug: "11", es: "oncena", aliases: ["oncena"] },
  { id: "m11", slug: "m11", es: "menor oncena", aliases: ["min11"] },
  { id: "13", slug: "13", es: "trecena", aliases: ["trecena"] },
  { id: "7sus4", slug: "7sus4", es: "séptima suspendida", aliases: ["7sus"] },
  { id: "9sus4", slug: "9sus4", es: "novena suspendida", aliases: ["9sus"] },
  { id: "7b9", slug: "7b9", es: "dominante con novena bemol", aliases: [] },
  { id: "7#9", slug: "7s9", es: "dominante con novena aumentada", aliases: ["7sharp9"] },
  { id: "7b5", slug: "7b5", es: "dominante con quinta bemol", aliases: [] },
  { id: "7#5", slug: "7s5", es: "dominante con quinta aumentada", aliases: ["7sharp5"] },
  { id: "maj7#11", slug: "maj7s11", es: "séptima mayor con oncena aumentada", aliases: ["maj7sharp11"] },
  { id: "7#11", slug: "7s11", es: "dominante con oncena aumentada", aliases: ["7sharp11"] },
  { id: "13b9", slug: "13b9", es: "trecena con novena bemol", aliases: [] },
];

export const QUALITY_BY_ID = new Map(QUALITIES.map((q) => [q.id, q]));

/**
 * Se registran primero todas las formas canónicas y recién después los alias,
 * y solo si el hueco quedó libre. De ese modo un alias nunca puede tapar la URL
 * canónica de otra cualidad por quedar antes en la lista.
 */
const QUALITY_LOOKUP = new Map<string, { quality: QualityMeta; canonical: boolean }>();
for (const quality of QUALITIES) {
  QUALITY_LOOKUP.set(quality.slug.toLowerCase(), { quality, canonical: true });
}
for (const quality of QUALITIES) {
  for (const alias of quality.aliases) {
    const key = alias.toLowerCase();
    if (!QUALITY_LOOKUP.has(key)) QUALITY_LOOKUP.set(key, { quality, canonical: false });
  }
}

/* ───────────────────────────── Escalas ───────────────────────────── */

export interface ScaleMeta {
  /** Clave en SCALES. */
  id: string;
  slug: string;
  aliases: string[];
}

/**
 * Slugs de escala. Se apartan a propósito del nombre que muestra la interfaz:
 * "mayor-jonico" o "lidio-b7-lidio-dominante" saldrían de slugificar el nombre,
 * pero nadie busca eso. La forma más buscada se queda con la URL canónica y el
 * resto de los nombres quedan como alias.
 */
export const SCALE_SLUGS: ScaleMeta[] = [
  { id: "pentatonicMinor", slug: "pentatonica-menor", aliases: ["menor-pentatonica"] },
  { id: "bluesMinor", slug: "blues", aliases: ["blues-menor", "escala-de-blues"] },
  { id: "pentatonicMajor", slug: "pentatonica-mayor", aliases: ["mayor-pentatonica"] },
  { id: "bluesMajor", slug: "blues-mayor", aliases: [] },
  { id: "bluesComposite", slug: "blues-compuesta", aliases: [] },
  { id: "suspendedPentatonic", slug: "pentatonica-suspendida", aliases: [] },
  { id: "major", slug: "mayor", aliases: ["jonico", "mayor-jonico", "escala-mayor"] },
  { id: "dorian", slug: "dorico", aliases: ["modo-dorico"] },
  { id: "phrygian", slug: "frigio", aliases: ["modo-frigio"] },
  { id: "lydian", slug: "lidio", aliases: ["modo-lidio"] },
  { id: "mixolydian", slug: "mixolidio", aliases: ["modo-mixolidio"] },
  { id: "aeolian", slug: "menor", aliases: ["menor-natural", "eolico", "escala-menor"] },
  { id: "locrian", slug: "locrio", aliases: ["modo-locrio"] },
  { id: "harmonicMinor", slug: "menor-armonica", aliases: ["armonica-menor"] },
  { id: "locrianNat6", slug: "locrio-natural-6", aliases: ["locrio-6"] },
  { id: "romanianMinor", slug: "rumana-menor", aliases: ["dorico-s4", "menor-rumana"] },
  { id: "phrygianDominant", slug: "frigio-dominante", aliases: ["frigia-dominante", "espanola"] },
  { id: "melodicMinor", slug: "menor-melodica", aliases: ["melodica-menor"] },
  { id: "lydianAugmented", slug: "lidio-aumentado", aliases: [] },
  { id: "lydianDominant", slug: "lidio-dominante", aliases: ["lidio-b7"] },
  { id: "mixolydianb6", slug: "mixolidio-b6", aliases: [] },
  { id: "locrianNat2", slug: "locrio-natural-2", aliases: ["locrio-2"] },
  { id: "altered", slug: "alterada", aliases: ["superlocria"] },
  { id: "bebopDominant", slug: "bebop-dominante", aliases: [] },
  { id: "bebopMajor", slug: "bebop-mayor", aliases: [] },
  { id: "bebopDorian", slug: "bebop-dorico", aliases: [] },
  { id: "wholeTone", slug: "tonos-enteros", aliases: ["hexafona", "por-tonos"] },
  { id: "diminishedWH", slug: "disminuida-tono-semitono", aliases: ["disminuida"] },
  { id: "diminishedHW", slug: "disminuida-semitono-tono", aliases: ["octatonica"] },
  { id: "chromatic", slug: "cromatica", aliases: [] },
  { id: "harmonicMajor", slug: "mayor-armonica", aliases: ["armonica-mayor"] },
  { id: "hungarianMinor", slug: "hungara-menor", aliases: ["gitana", "hungara"] },
  { id: "doubleHarmonic", slug: "doble-armonica", aliases: ["bizantina"] },
  { id: "neapolitanMinor", slug: "napolitana-menor", aliases: [] },
  { id: "hirajoshi", slug: "hirajoshi", aliases: ["japonesa"] },
  { id: "inSen", slug: "in-sen", aliases: ["insen"] },
];

export const SCALE_BY_ID = new Map(SCALE_SLUGS.map((s) => [s.id, s]));

// Mismo criterio que en las cualidades: canónicas primero, alias después.
const SCALE_LOOKUP = new Map<string, { scale: ScaleMeta; canonical: boolean }>();
for (const scale of SCALE_SLUGS) {
  SCALE_LOOKUP.set(scale.slug, { scale, canonical: true });
}
for (const scale of SCALE_SLUGS) {
  for (const alias of scale.aliases) {
    if (!SCALE_LOOKUP.has(alias)) SCALE_LOOKUP.set(alias, { scale, canonical: false });
  }
}

/* ──────────────────────── Construcción y parseo ──────────────────────── */

export interface ChordRoute {
  note: NoteMeta;
  quality: QualityMeta;
  /** Slug canónico. Si difiere del pedido, la página redirige. */
  canonical: string;
}

export function chordSlug(pc: PitchClass, qualityId: string): string | null {
  const note = NOTE_BY_PC.get(pc);
  const quality = QUALITY_BY_ID.get(qualityId);
  return note && quality ? `${note.slug}-${quality.slug}` : null;
}

export function parseChordSlug(slug: string): ChordRoute | null {
  const head = splitNote(slug.toLowerCase());
  if (!head || !head.rest) return null;
  const found = QUALITY_LOOKUP.get(head.rest);
  if (!found || !FORMULAS[found.quality.id]) return null;
  return {
    note: head.note,
    quality: found.quality,
    canonical: `${head.note.slug}-${found.quality.slug}`,
  };
}

export interface ScaleRoute {
  note: NoteMeta;
  scale: ScaleMeta;
  canonical: string;
}

export function scaleSlug(pc: PitchClass, scaleId: string): string | null {
  const note = NOTE_BY_PC.get(pc);
  const scale = SCALE_BY_ID.get(scaleId);
  return note && scale ? `${note.slug}-${scale.slug}` : null;
}

export function parseScaleSlug(slug: string): ScaleRoute | null {
  const head = splitNote(slug.toLowerCase());
  if (!head || !head.rest) return null;
  const found = SCALE_LOOKUP.get(head.rest);
  if (!found || !SCALES[found.scale.id]) return null;
  return {
    note: head.note,
    scale: found.scale,
    canonical: `${head.note.slug}-${found.scale.slug}`,
  };
}

/* ─────────────────────── Listados para prerender ─────────────────────── */

/** Las 420 combinaciones canónicas de acorde (12 fundamentales × 35 cualidades). */
export function allChordSlugs(): string[] {
  return NOTES.flatMap((note) => QUALITIES.map((q) => `${note.slug}-${q.slug}`));
}

/** Las 432 combinaciones canónicas de escala (12 tónicas × 36 escalas). */
export function allScaleSlugs(): string[] {
  return NOTES.flatMap((note) => SCALE_SLUGS.map((s) => `${note.slug}-${s.slug}`));
}
