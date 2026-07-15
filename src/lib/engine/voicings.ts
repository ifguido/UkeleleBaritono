/**
 * Generación, análisis y validación determinista de voicings.
 *
 * Un voicing jamás se considera válido por "parecerse" a una forma conocida:
 * se calculan las notas reales de cada cuerda y se comparan con los
 * intervalos del acorde.
 */

import { Midi, PitchClass, Tuning, midiToPc, midiName, pcName, BARITONE } from "./notes";
import { ParsedChord, chordPitchClasses, degreeLabel } from "./chords";

export type Fret = number | null; // null = cuerda silenciada

export interface Barre {
  fret: number;
  fromString: number; // índice de cuerda (0 = más grave)
  toString: number;
}

export interface Voicing {
  frets: Fret[];
  display: string; // "x-6-5-4" en orden D-G-B-E
  midiNotes: Midi[]; // solo cuerdas que suenan, en orden de cuerda
  noteNames: string[];
  pitchClasses: PitchClass[];
  /** Intervalo de cada cuerda que suena respecto de la fundamental. */
  intervals: string[];
  bassMidi: Midi;
  bassNote: string;
  bassDegree: string | null;
  topMidi: Midi;
  topNote: string;
  inversion: string;
  exact: boolean;
  partial: boolean;
  /** Notas del acorde que no suenan, ej. ["F# (5)"]. */
  omitted: string[];
  /** Notas ajenas al acorde, ej. ["D# (no pertenece)"]. */
  added: string[];
  duplicated: string[];
  /**
   * Cuerdas que producen exactamente la misma nota (unísono). Duplicar en
   * octavas suena lleno (D/F# = 4-2-3-2); el unísono desperdicia una cuerda
   * y suena chato (E = 2-4-0-4 con B3 repetida).
   */
  unisonCount: number;
  span: number;
  minFret: number; // menor traste pisado (0 si todo al aire)
  maxFretUsed: number;
  avgFret: number;
  fingers: number;
  barre: Barre | null;
  openCount: number;
  mutedCount: number;
  soundingCount: number;
  difficulty: number;
  warnings: string[];
}

export interface VoicingOptions {
  tuning?: Tuning;
  maxFret?: number;
  minStrings?: number;
  allowMuted?: boolean;
  allowInteriorMutes?: boolean;
  allowInversions?: boolean;
  requireRootInBass?: boolean;
  allowOmittedFifth?: boolean;
  allowOmittedRoot?: boolean;
  maxSpan?: number;
}

export const DEFAULT_OPTIONS: Required<VoicingOptions> = {
  tuning: BARITONE,
  maxFret: 12,
  minStrings: 3,
  allowMuted: true,
  allowInteriorMutes: false,
  allowInversions: true,
  requireRootInBass: false,
  allowOmittedFifth: true,
  allowOmittedRoot: false,
  maxSpan: 4,
};

export interface ValidationReport {
  valid: boolean;
  status: "exact" | "partial" | "invalid";
  problems: string[];
  voicing: Voicing;
}

export function displayFrets(frets: Fret[]): string {
  return frets.map((fret) => (fret === null ? "x" : String(fret))).join("-");
}

/** Parsea "2-1-0-0" o "x-6-5-4" → frets. null si el formato es inválido. */
export function parseFretString(input: string): Fret[] | null {
  const parts = input.trim().split(/[-,\s]+/).filter(Boolean);
  if (parts.length !== 4) return null;
  const frets: Fret[] = [];
  for (const part of parts) {
    if (part.toLowerCase() === "x") frets.push(null);
    else if (/^\d+$/.test(part)) frets.push(parseInt(part, 10));
    else return null;
  }
  return frets;
}

interface FingeringInfo {
  fingers: number;
  barre: Barre | null;
}

/** Estima dedos necesarios; usa cejilla cuando reduce el trabajo. */
function estimateFingering(frets: Fret[]): FingeringInfo {
  const fretted = frets
    .map((fret, idx) => ({ fret, idx }))
    .filter((s): s is { fret: number; idx: number } => s.fret !== null && s.fret > 0);
  if (fretted.length === 0) return { fingers: 0, barre: null };

  const noBarre = fretted.length;
  const minFret = Math.min(...fretted.map((s) => s.fret));
  const atMin = fretted.filter((s) => s.fret === minFret);
  if (atMin.length >= 2) {
    const from = Math.min(...atMin.map((s) => s.idx));
    const to = Math.max(...atMin.map((s) => s.idx));
    // La cejilla exige que ninguna cuerda dentro del rango suene al aire.
    let feasible = true;
    for (let i = from; i <= to; i++) {
      if (frets[i] === 0) feasible = false;
    }
    if (feasible) {
      const withBarre = 1 + fretted.filter((s) => s.fret > minFret).length;
      if (withBarre < noBarre) {
        return { fingers: withBarre, barre: { fret: minFret, fromString: from, toString: to } };
      }
    }
  }
  return { fingers: noBarre, barre: null };
}

function computeDifficulty(v: {
  fingers: number;
  barre: Barre | null;
  span: number;
  avgFret: number;
  mutedCount: number;
  mutedTrebleCount: number;
  openCount: number;
}): number {
  let d = v.fingers * 0.5;
  if (v.span > 2) d += (v.span - 2) * 0.9;
  if (v.barre) d += 0.9;
  if (v.avgFret > 5) d += (v.avgFret - 5) * 0.25;
  d += v.mutedCount * 0.35;
  // Silenciar cuerdas agudas cortando el rasgueo es más incómodo que
  // saltear las graves al empezar.
  d += v.mutedTrebleCount * 0.5;
  d -= v.openCount * 0.2;
  return Math.max(0, Math.round(d * 10) / 10);
}

function inversionName(bassDegree: string | null): string {
  switch (bassDegree) {
    case "1":
      return "posición fundamental";
    case "3":
    case "b3":
      return "1ª inversión (3ª en el bajo)";
    case "5":
    case "b5":
    case "#5":
      return "2ª inversión (5ª en el bajo)";
    case "7":
    case "b7":
    case "bb7":
      return "3ª inversión (7ª en el bajo)";
    case null:
      return "bajo ajeno al acorde";
    default:
      return `${bassDegree} en el bajo`;
  }
}

/**
 * Analiza y valida una digitación contra un acorde.
 * Es la ÚNICA fuente de verdad sobre si un voicing es correcto.
 */
export function validateVoicing(
  chord: ParsedChord,
  frets: Fret[],
  options: VoicingOptions = {},
): ValidationReport {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tuning = opts.tuning;
  const problems: string[] = [];
  const warnings: string[] = [];

  const sounding = frets
    .map((fret, idx) => ({ fret, idx }))
    .filter((s): s is { fret: number; idx: number } => s.fret !== null);

  const midiNotes = sounding.map((s) => tuning.strings[s.idx] + s.fret);
  const pitchClasses = midiNotes.map(midiToPc);
  const chordPcs = chordPitchClasses(chord);
  const useFlats = chord.useFlats;

  // Bajo y soprano REALES (las cuerdas silenciadas no cuentan)
  const bassMidi = midiNotes.length ? Math.min(...midiNotes) : -1;
  const topMidi = midiNotes.length ? Math.max(...midiNotes) : -1;
  const bassPc = bassMidi >= 0 ? midiToPc(bassMidi) : -1;

  // Notas requeridas / omitibles según fórmula y opciones
  let required = new Set(chord.formula.required);
  const omittable = new Set(chord.formula.omittable);
  if (!opts.allowOmittedFifth) {
    for (const semis of chord.formula.omittable) {
      if (semis === 7) {
        required.add(7);
        omittable.delete(7);
      }
    }
  }
  // Con más notas requeridas que cuerdas, la fundamental pasa a ser omitible
  if (opts.allowOmittedRoot || required.size > tuning.strings.length) {
    if (required.has(0)) {
      required.delete(0);
      omittable.add(0);
    }
  }
  // Si el bajo slash está presente como nota más grave, esa nota cubre
  // su eventual rol de nota requerida del acorde.

  const presentSemis = new Set(
    pitchClasses.map((pc) => ((pc - chord.root) % 12 + 12) % 12),
  );

  // Notas ajenas
  const added: string[] = [];
  const extraBassPc = chord.bass !== null && !chordPcs.has(chord.bass) ? chord.bass : null;
  for (const pc of new Set(pitchClasses)) {
    if (!chordPcs.has(pc)) {
      if (pc === extraBassPc && pc === bassPc && pitchClasses.filter((x) => x === pc).length === 1) {
        added.push(`${pcName(pc, useFlats)} (bajo indicado)`);
      } else {
        added.push(`${pcName(pc, useFlats)} (no pertenece al acorde)`);
        problems.push(
          `La nota ${pcName(pc, useFlats)} no pertenece a ${chord.normalized}.`,
        );
      }
    }
  }

  // Notas requeridas ausentes
  const omitted: string[] = [];
  for (const semis of chord.formula.intervals.map((i) => i.semitones)) {
    if (!presentSemis.has(semis)) {
      const pc = (chord.root + semis) % 12;
      if (pc === extraBassPc && pc === bassPc) continue;
      const label = chord.formula.intervals.find((i) => i.semitones === semis)!.label;
      omitted.push(`${pcName(pc, useFlats)} (${label})`);
      if (required.has(semis)) {
        problems.push(
          `Falta la nota ${pcName(pc, useFlats)} (${label}), imprescindible en ${chord.normalized}.`,
        );
      }
    }
  }

  // Bajo de slash chord: requisito duro
  if (chord.bass !== null && bassPc >= 0 && bassPc !== chord.bass) {
    problems.push(
      `${chord.normalized} exige ${pcName(chord.bass, useFlats)} como nota más grave, pero suena ${pcName(bassPc, useFlats)}.`,
    );
  }

  if (sounding.length < opts.minStrings) {
    problems.push(`Suenan solo ${sounding.length} cuerdas (mínimo ${opts.minStrings}).`);
  }

  // Física
  const frettedFrets = sounding.filter((s) => s.fret > 0).map((s) => s.fret);
  const minFret = frettedFrets.length ? Math.min(...frettedFrets) : 0;
  const maxFretUsed = frettedFrets.length ? Math.max(...frettedFrets) : 0;
  const span = frettedFrets.length ? maxFretUsed - minFret : 0;
  const avgFret = frettedFrets.length
    ? frettedFrets.reduce((a, b) => a + b, 0) / frettedFrets.length
    : 0;
  if (span > opts.maxSpan) {
    problems.push(`Apertura de ${span} trastes: supera el máximo de ${opts.maxSpan}.`);
  }

  const mutedCount = frets.filter((fret) => fret === null).length;
  // Silenciar una cuerda interior mientras suenan sus vecinas es poco práctico
  const firstSounding = frets.findIndex((fret) => fret !== null);
  const lastSounding = frets.length - 1 - [...frets].reverse().findIndex((fret) => fret !== null);
  let interiorMute = false;
  for (let i = firstSounding; i <= lastSounding; i++) {
    if (frets[i] === null) interiorMute = true;
  }
  if (interiorMute) {
    if (opts.allowInteriorMutes) warnings.push("Cuerda interior silenciada: requiere apagado con un dedo.");
    else problems.push("Cuerda interior silenciada: digitación poco práctica.");
  }

  const { fingers, barre } = estimateFingering(frets);
  if (fingers > 4) problems.push(`Requiere ${fingers} dedos.`);

  const openCount = sounding.filter((s) => s.fret === 0).length;
  const mutedTrebleCount = sounding.length > 0 ? frets.length - 1 - lastSounding : 0;
  const difficulty = computeDifficulty({
    fingers,
    barre,
    span,
    avgFret,
    mutedCount,
    mutedTrebleCount,
    openCount,
  });

  // Duplicadas (pitch class) y unísonos (misma nota exacta en dos cuerdas)
  const duplicated: string[] = [];
  const counts = new Map<PitchClass, number>();
  for (const pc of pitchClasses) counts.set(pc, (counts.get(pc) ?? 0) + 1);
  for (const [pc, count] of counts) {
    if (count > 1) duplicated.push(pcName(pc, useFlats));
  }
  const unisonCount = midiNotes.length - new Set(midiNotes).size;

  const allChordNotesPresent = chord.formula.intervals.every((i) =>
    presentSemis.has(i.semitones),
  );
  const hasForeignNotes = added.some((a) => a.includes("no pertenece"));
  const exact = allChordNotesPresent && !hasForeignNotes && problems.length === 0;
  const valid = problems.length === 0;
  const partial = valid && !exact;

  if (partial && omitted.length) {
    warnings.push(`Acorde parcial: se omite ${omitted.join(", ")}.`);
  }

  const bassDeg = bassPc >= 0 ? degreeLabel(chord, bassPc) : null;
  const voicing: Voicing = {
    frets,
    display: displayFrets(frets),
    midiNotes,
    noteNames: midiNotes.map((m) => midiName(m, useFlats)),
    pitchClasses,
    intervals: pitchClasses.map((pc) => degreeLabel(chord, pc) ?? "ajena"),
    bassMidi,
    bassNote: bassPc >= 0 ? pcName(bassPc, useFlats) : "-",
    bassDegree: bassDeg,
    topMidi,
    topNote: topMidi >= 0 ? pcName(midiToPc(topMidi), useFlats) : "-",
    inversion:
      chord.bass !== null && bassPc === chord.bass && bassDeg === null
        ? `bajo ${pcName(chord.bass, useFlats)} (slash)`
        : inversionName(bassDeg),
    exact,
    partial,
    omitted,
    added,
    duplicated,
    unisonCount,
    span,
    minFret,
    maxFretUsed,
    avgFret: Math.round(avgFret * 10) / 10,
    fingers,
    barre,
    openCount,
    mutedCount,
    soundingCount: sounding.length,
    difficulty,
    warnings,
  };

  return {
    valid,
    status: exact ? "exact" : valid ? "partial" : "invalid",
    problems,
    voicing,
  };
}

/**
 * Genera todos los voicings válidos de un acorde explorando el diapasón.
 * Nunca devuelve un voicing que no haya pasado por validateVoicing.
 */
export function generateVoicings(
  chord: ParsedChord,
  options: VoicingOptions = {},
): Voicing[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tuning = opts.tuning;
  const chordPcs = chordPitchClasses(chord);
  const allowedPcs = new Set(chordPcs);
  if (chord.bass !== null) allowedPcs.add(chord.bass);

  // Por cuerda: trastes cuya nota pertenece al acorde (+ silenciada)
  const optionsPerString: Fret[][] = tuning.strings.map((open) => {
    const frets: Fret[] = [];
    if (opts.allowMuted) frets.push(null);
    for (let fret = 0; fret <= opts.maxFret; fret++) {
      if (allowedPcs.has(midiToPc(open + fret))) frets.push(fret);
    }
    return frets;
  });

  const results: Voicing[] = [];
  const seen = new Set<string>();
  const current: Fret[] = new Array(tuning.strings.length).fill(null);

  const explore = (stringIdx: number) => {
    if (stringIdx === tuning.strings.length) {
      const report = validateVoicing(chord, [...current], opts);
      if (!report.valid) return;
      const v = report.voicing;

      // Filtros de generación (no de validez)
      if (chord.bass === null) {
        const isRootBass = midiToPc(v.bassMidi) === chord.root;
        if (opts.requireRootInBass && !isRootBass) return;
        if (!opts.allowInversions && !isRootBass) return;
      }
      if (seen.has(v.display)) return;
      seen.add(v.display);
      results.push(v);
      return;
    }
    for (const fret of optionsPerString[stringIdx]) {
      current[stringIdx] = fret;
      explore(stringIdx + 1);
    }
    current[stringIdx] = null;
  };
  explore(0);

  results.sort((a, b) => recommendScore(a) - recommendScore(b));
  return results;
}

/**
 * Puntaje intrínseco para ordenar por "recomendado":
 * más bajo = mejor. La corrección ya está garantizada.
 */
export function recommendScore(v: Voicing): number {
  let score = v.difficulty;
  score += v.omitted.length * 0.8;
  // Preferencia leve por la fundamental en el bajo: una inversión no es un
  // problema (se etiqueta), solo se ordena un poco después.
  if (v.bassDegree !== "1") score += 0.55;
  score += v.unisonCount * 0.7; // unísonos: cuerda desperdiciada, sonido chato
  score += (4 - v.soundingCount) * 0.5;
  score += v.minFret > 0 ? v.minFret * 0.12 : 0; // preferir zona baja
  score += v.added.length * 0.5; // bajos slash ajenos: leve penalización
  return score;
}
