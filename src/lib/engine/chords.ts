/**
 * Construcción de acordes por intervalos (nunca por tablas de formas)
 * y parser de símbolos de acorde.
 */

import { PitchClass, parseNoteName, pcName } from "./notes";

export interface IntervalDef {
  /** Semitonos desde la fundamental, en espacio de pitch class (0–11). */
  semitones: number;
  /** Etiqueta del grado: "1", "b3", "5", "b7", "9", "bb7", etc. */
  label: string;
}

export interface ChordFormula {
  quality: string;
  /** Sufijo canónico para mostrar ("" = mayor). */
  suffix: string;
  intervals: IntervalDef[];
  /** Semitonos que DEBEN sonar (la fundamental se maneja aparte). */
  required: number[];
  /** Semitonos omitibles sin dejar de ser el acorde (se etiquetan). */
  omittable: number[];
  description: string;
}

function f(
  quality: string,
  suffix: string,
  intervals: [number, string][],
  required: number[],
  omittable: number[],
  description: string,
): ChordFormula {
  return {
    quality,
    suffix,
    intervals: intervals.map(([semitones, label]) => ({ semitones, label })),
    required,
    omittable,
    description,
  };
}

/**
 * Fórmulas: la fundamental (0) siempre es requerida por defecto;
 * el generador puede moverla a omitible según configuración o cuando
 * el acorde tiene más notas requeridas que cuerdas.
 */
export const FORMULAS: Record<string, ChordFormula> = {
  major: f("major", "", [[0, "1"], [4, "3"], [7, "5"]], [0, 4], [7], "mayor"),
  minor: f("minor", "m", [[0, "1"], [3, "b3"], [7, "5"]], [0, 3], [7], "menor"),
  dim: f("dim", "dim", [[0, "1"], [3, "b3"], [6, "b5"]], [0, 3, 6], [], "disminuido"),
  aug: f("aug", "aug", [[0, "1"], [4, "3"], [8, "#5"]], [0, 4, 8], [], "aumentado"),
  sus2: f("sus2", "sus2", [[0, "1"], [2, "2"], [7, "5"]], [0, 2, 7], [], "suspendido 2"),
  sus4: f("sus4", "sus4", [[0, "1"], [5, "4"], [7, "5"]], [0, 5, 7], [], "suspendido 4"),
  "5": f("5", "5", [[0, "1"], [7, "5"]], [0, 7], [], "power chord"),
  "6": f("6", "6", [[0, "1"], [4, "3"], [7, "5"], [9, "6"]], [0, 4, 9], [7], "sexta"),
  m6: f("m6", "m6", [[0, "1"], [3, "b3"], [7, "5"], [9, "6"]], [0, 3, 9], [7], "menor sexta"),
  "69": f("69", "6/9", [[0, "1"], [4, "3"], [7, "5"], [9, "6"], [2, "9"]], [0, 4, 9, 2], [7], "sexta con novena"),
  "7": f("7", "7", [[0, "1"], [4, "3"], [7, "5"], [10, "b7"]], [0, 4, 10], [7], "séptima dominante"),
  maj7: f("maj7", "maj7", [[0, "1"], [4, "3"], [7, "5"], [11, "7"]], [0, 4, 11], [7], "séptima mayor"),
  m7: f("m7", "m7", [[0, "1"], [3, "b3"], [7, "5"], [10, "b7"]], [0, 3, 10], [7], "menor séptima"),
  mMaj7: f("mMaj7", "m(maj7)", [[0, "1"], [3, "b3"], [7, "5"], [11, "7"]], [0, 3, 11], [7], "menor con séptima mayor"),
  m7b5: f("m7b5", "m7b5", [[0, "1"], [3, "b3"], [6, "b5"], [10, "b7"]], [0, 3, 6, 10], [], "semidisminuido"),
  dim7: f("dim7", "dim7", [[0, "1"], [3, "b3"], [6, "b5"], [9, "bb7"]], [0, 3, 6, 9], [], "disminuido séptima"),
  add9: f("add9", "add9", [[0, "1"], [4, "3"], [7, "5"], [2, "9"]], [0, 4, 2], [7], "con novena añadida"),
  madd9: f("madd9", "m(add9)", [[0, "1"], [3, "b3"], [7, "5"], [2, "9"]], [0, 3, 2], [7], "menor con novena añadida"),
  add4: f("add4", "add4", [[0, "1"], [4, "3"], [5, "4"], [7, "5"]], [0, 4, 5], [7], "con cuarta añadida (mantiene la 3ª, a diferencia de sus4)"),
  add11: f("add11", "add11", [[0, "1"], [4, "3"], [7, "5"], [5, "11"]], [0, 4, 5], [7], "con oncena añadida"),
  "9": f("9", "9", [[0, "1"], [4, "3"], [7, "5"], [10, "b7"], [2, "9"]], [0, 4, 10, 2], [7], "novena dominante"),
  maj9: f("maj9", "maj9", [[0, "1"], [4, "3"], [7, "5"], [11, "7"], [2, "9"]], [0, 4, 11, 2], [7], "novena mayor"),
  m9: f("m9", "m9", [[0, "1"], [3, "b3"], [7, "5"], [10, "b7"], [2, "9"]], [0, 3, 10, 2], [7], "menor novena"),
  "11": f("11", "11", [[0, "1"], [4, "3"], [7, "5"], [10, "b7"], [2, "9"], [5, "11"]], [0, 10, 5], [4, 7, 2], "oncena"),
  m11: f("m11", "m11", [[0, "1"], [3, "b3"], [7, "5"], [10, "b7"], [2, "9"], [5, "11"]], [0, 3, 10, 5], [7, 2], "menor oncena"),
  "13": f("13", "13", [[0, "1"], [4, "3"], [7, "5"], [10, "b7"], [2, "9"], [9, "13"]], [0, 4, 10, 9], [7, 2], "trecena"),
  "7sus4": f("7sus4", "7sus4", [[0, "1"], [5, "4"], [7, "5"], [10, "b7"]], [0, 5, 10], [7], "séptima suspendida"),
  "9sus4": f("9sus4", "9sus4", [[0, "1"], [5, "4"], [7, "5"], [10, "b7"], [2, "9"]], [0, 5, 10, 2], [7], "novena suspendida"),
  "7b9": f("7b9", "7b9", [[0, "1"], [4, "3"], [7, "5"], [10, "b7"], [1, "b9"]], [0, 4, 10, 1], [7], "dominante con novena bemol"),
  "7#9": f("7#9", "7#9", [[0, "1"], [4, "3"], [7, "5"], [10, "b7"], [3, "#9"]], [0, 4, 10, 3], [7], "dominante con novena aumentada"),
  "7b5": f("7b5", "7b5", [[0, "1"], [4, "3"], [6, "b5"], [10, "b7"]], [0, 4, 6, 10], [], "dominante con quinta bemol"),
  "7#5": f("7#5", "7#5", [[0, "1"], [4, "3"], [8, "#5"], [10, "b7"]], [0, 4, 8, 10], [], "dominante con quinta aumentada"),
  "maj7#11": f("maj7#11", "maj7#11", [[0, "1"], [4, "3"], [7, "5"], [11, "7"], [6, "#11"]], [0, 4, 11, 6], [7], "séptima mayor con oncena aumentada"),
  "7#11": f("7#11", "7#11", [[0, "1"], [4, "3"], [7, "5"], [10, "b7"], [6, "#11"]], [0, 4, 10, 6], [7], "dominante con oncena aumentada"),
  "13b9": f("13b9", "13b9", [[0, "1"], [4, "3"], [7, "5"], [10, "b7"], [1, "b9"], [9, "13"]], [0, 4, 10, 1, 9], [7], "trecena con novena bemol"),
};

/** Alias de sufijo → quality canónica. Se comparan sin distinguir mayúsc. donde es seguro. */
const QUALITY_ALIASES: [string, string][] = [
  // orden: los más largos primero para el matching
  ["m(maj7)", "mMaj7"], ["minmaj7", "mMaj7"], ["mmaj7", "mMaj7"], ["mM7", "mMaj7"], ["-maj7", "mMaj7"],
  ["maj7#11", "maj7#11"], ["Δ7#11", "maj7#11"],
  ["m(add9)", "madd9"], ["madd9", "madd9"], ["minadd9", "madd9"],
  ["m7b5", "m7b5"], ["m7♭5", "m7b5"], ["min7b5", "m7b5"], ["ø7", "m7b5"], ["ø", "m7b5"], ["Ø7", "m7b5"], ["Ø", "m7b5"], ["-7b5", "m7b5"],
  ["dim7", "dim7"], ["°7", "dim7"], ["º7", "dim7"], ["o7", "dim7"],
  ["dim", "dim"], ["°", "dim"], ["º", "dim"], ["o", "dim"],
  ["13b9", "13b9"],
  ["7sus4", "7sus4"], ["7sus", "7sus4"],
  ["9sus4", "9sus4"], ["9sus", "9sus4"],
  ["7b9", "7b9"], ["7♭9", "7b9"], ["7(b9)", "7b9"],
  ["7#9", "7#9"], ["7♯9", "7#9"], ["7(#9)", "7#9"],
  ["7b5", "7b5"], ["7♭5", "7b5"], ["7(b5)", "7b5"],
  ["7#5", "7#5"], ["7♯5", "7#5"], ["7(#5)", "7#5"], ["aug7", "7#5"], ["+7", "7#5"], ["7+", "7#5"],
  ["maj9", "maj9"], ["M9", "maj9"], ["Δ9", "maj9"],
  ["maj7", "maj7"], ["M7", "maj7"], ["7M", "maj7"], ["Δ7", "maj7"], ["Δ", "maj7"], ["ma7", "maj7"], ["j7", "maj7"],
  ["add2", "add9"],
  ["madd11", "m11"],
  ["m11", "m11"], ["min11", "m11"], ["-11", "m11"],
  ["m9", "m9"], ["min9", "m9"], ["-9", "m9"],
  ["m7", "m7"], ["min7", "m7"], ["-7", "m7"],
  ["m6", "m6"], ["min6", "m6"], ["-6", "m6"],
  ["add9", "add9"], ["(add9)", "add9"],
  ["add4", "add4"], ["add11", "add11"],
  ["7#11", "7#11"], ["7♯11", "7#11"], ["7b13", "7#5"], ["7♭13", "7#5"],
  // En cifrado popular, C2 y C4 son suspensiones (la 3ª se reemplaza)
  ["sus2", "sus2"], ["sus4", "sus4"], ["sus", "sus4"], ["4", "sus4"], ["2", "sus2"],
  ["6/9", "69"], ["69", "69"], ["6add9", "69"],
  ["aug", "aug"], ["+", "aug"], ["#5", "aug"],
  ["maj", "major"], ["M", "major"],
  ["min", "minor"], ["m", "minor"], ["-", "minor"],
  ["13", "13"], ["11", "11"], ["9", "9"], ["7", "7"], ["6", "6"], ["5", "5"],
  ["", "major"],
];

export interface ParsedChord {
  /** Símbolo tal como lo escribió el usuario. */
  original: string;
  /** Símbolo normalizado, ej. "C#m7" o "G/B". */
  normalized: string;
  root: PitchClass;
  /** Nombre de la fundamental como lo escribió el usuario ("Db", "C#"...). */
  rootName: string;
  /** Bajo explícito (slash chord), si lo hay. */
  bass: PitchClass | null;
  bassName: string | null;
  quality: string;
  formula: ChordFormula;
  /** Preferir bemoles al nombrar las notas de este acorde. */
  useFlats: boolean;
}

export interface ChordParseError {
  input: string;
  message: string;
}

export type ChordParseResult =
  | { ok: true; chord: ParsedChord }
  | { ok: false; error: ChordParseError };

/** Pitch classes del acorde (sin contar el bajo slash). */
export function chordPitchClasses(chord: ParsedChord): Set<PitchClass> {
  return new Set(chord.formula.intervals.map((i) => (chord.root + i.semitones) % 12));
}

/** Etiqueta de grado para un pc dentro del acorde ("1", "b3"...), o null si es ajeno. */
export function degreeLabel(chord: ParsedChord, pc: PitchClass): string | null {
  const semis = ((pc - chord.root) % 12 + 12) % 12;
  const def = chord.formula.intervals.find((i) => i.semitones === semis);
  return def ? def.label : null;
}

export function parseChord(input: string): ChordParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: { input, message: "Símbolo vacío." } };

  // Fundamental
  const rootMatch = /^([A-G])(#|b|♯|♭)?/.exec(raw);
  if (!rootMatch) {
    return {
      ok: false,
      error: { input: raw, message: `No entiendo este acorde: "${raw}". Debe empezar con una nota A–G.` },
    };
  }
  const rootName = rootMatch[1] + (rootMatch[2] === "♯" ? "#" : rootMatch[2] === "♭" ? "b" : rootMatch[2] ?? "");
  const root = parseNoteName(rootName)!;
  let rest = raw.slice(rootMatch[0].length);

  // Bajo slash: la parte tras "/" solo cuenta como bajo si es una nota válida
  // (así "C6/9" no se confunde con un slash chord).
  let bass: PitchClass | null = null;
  let bassName: string | null = null;
  const slashIdx = rest.lastIndexOf("/");
  if (slashIdx >= 0) {
    const candidate = rest.slice(slashIdx + 1);
    const bassPc = parseNoteName(candidate);
    if (bassPc !== null) {
      bass = bassPc;
      bassName = candidate.replace("♯", "#").replace("♭", "b");
      rest = rest.slice(0, slashIdx);
    }
  }

  // Calidad
  let qualityToken = rest.trim().replace(/\s+/g, "");
  // Números entre paréntesis: su significado depende de lo que hay antes.
  //   Con séptima:  7(9)→9, m7(9)→m9, maj7(9)→maj9, 7(4)→7sus4, 7(11)→11, 7(13)→13
  //   Sin séptima:  (9)→add9, (11)→add11, (4)→sus4, (2)→sus2
  // Así Em7(9) = Em9 (con séptima) y Em(9) = Em(add9) (sin séptima).
  qualityToken = qualityToken
    .replace(/7\(add9\)$/i, "9")
    .replace(/7add9$/i, "9")
    .replace(/7\(9,\s*11\)$/, "11")
    .replace(/7\(9,\s*13\)$/, "13")
    .replace(/7\((b5|#5|b9|#9|#11|b13|♭5|♯5|♭9|♯9|♯11|♭13)\)$/, "7$1")
    .replace(/7\((4|9|11|13)\)$/, (_, n: string) => (n === "4" ? "7sus4" : n))
    .replace(/7\/(9|11|13)$/, "$1")
    .replace(/\(add(2|4|9|11)\)$/i, "add$1")
    .replace(/\((9|11)\)$/, "add$1")
    .replace(/\((4)\)$/, "sus4")
    .replace(/\((2)\)$/, "sus2");
  let quality: string | null = null;
  for (const [alias, canonical] of QUALITY_ALIASES) {
    if (qualityToken === alias) {
      quality = canonical;
      break;
    }
  }
  // Segundo intento, sin distinguir mayúsculas (excepto alias de una letra
  // donde M/m importa)
  if (quality === null) {
    const lower = qualityToken.toLowerCase();
    for (const [alias, canonical] of QUALITY_ALIASES) {
      if (alias.length > 1 && alias.toLowerCase() === lower) {
        quality = canonical;
        break;
      }
    }
  }
  if (quality === null) {
    return {
      ok: false,
      error: {
        input: raw,
        message: `No reconozco la calidad "${qualityToken}" en "${raw}". Ejemplos válidos: C, Cm, C7, Cmaj7, Cm7b5, Cdim7, Csus4, Cadd9, C9, C/E.`,
      },
    };
  }

  const formula = FORMULAS[quality];
  const useFlats = rootName.includes("b") || (bassName?.includes("b") ?? false);
  const normalized =
    pcName(root, useFlats) + formula.suffix + (bassName ? "/" + pcName(bass!, useFlats) : "");

  return {
    ok: true,
    chord: {
      original: raw,
      normalized,
      root,
      rootName,
      bass,
      bassName,
      quality,
      formula,
      useFlats,
    },
  };
}

/**
 * Cifrado latino (Do Re Mi…) → letras. Solo para entrada directa
 * (Explorador): en canciones pegadas "La", "Mi" o "Sol" son palabras
 * demasiado comunes y arruinarían la detección de líneas de acordes.
 */
const SOLFEGE: [RegExp, string][] = [
  [/^do/i, "C"],
  [/^re/i, "D"],
  [/^mi/i, "E"],
  [/^fa/i, "F"],
  [/^sol/i, "G"],
  [/^la/i, "A"],
  [/^si/i, "B"],
];

export function parseChordFlexible(input: string): ChordParseResult {
  const direct = parseChord(input);
  if (direct.ok) return direct;
  const trimmed = input.trim();
  for (const [re, letter] of SOLFEGE) {
    if (re.test(trimmed)) {
      const translated = parseChord(letter + trimmed.replace(re, ""));
      if (translated.ok) return translated;
    }
  }
  return direct;
}

/** ¿Este token parece un acorde? (para el parser de canciones) */
export function isChordToken(token: string): boolean {
  const cleaned = token.replace(/[(),.|]+$/g, "").replace(/^[(|]+/g, "");
  if (!cleaned) return false;
  return parseChord(cleaned).ok;
}
