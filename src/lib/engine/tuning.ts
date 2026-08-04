/**
 * De frecuencia a nota y viceversa: lo que necesita un afinador.
 *
 * Todo depende de una sola referencia (La4, 440 Hz por defecto). Cambiarla
 * mueve las doce notas a la vez, que es exactamente lo que hace falta para
 * tocar con alguien afinado en 432 o con un piano viejo.
 */

import { Midi, PC_NAMES_SHARP, Tuning, midiToPc } from "./notes";

export const DEFAULT_A4 = 440;

export function midiToFrequency(midi: Midi, a4 = DEFAULT_A4): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/** Nota MIDI con decimales: 60.5 es medio semitono arriba de C4. */
export function frequencyToMidiFloat(frequency: number, a4 = DEFAULT_A4): number {
  return 69 + 12 * Math.log2(frequency / a4);
}

/** Diferencia en cents entre dos frecuencias (positivo = la primera es más aguda). */
export function centsBetween(frequency: number, reference: number): number {
  return 1200 * Math.log2(frequency / reference);
}

export interface NoteReading {
  frequency: number;
  /** Nota temperada más cercana. */
  midi: Midi;
  /** "A", "C#"… */
  noteName: string;
  octave: number;
  /** "A3", "C#4". */
  fullName: string;
  /** Desvío respecto de esa nota, entre −50 y +50. */
  cents: number;
}

/** Qué nota es esta frecuencia y cuánto le falta o le sobra. */
export function readNote(frequency: number, a4 = DEFAULT_A4): NoteReading {
  const exact = frequencyToMidiFloat(frequency, a4);
  const midi = Math.round(exact);
  return {
    frequency,
    midi,
    noteName: PC_NAMES_SHARP[midiToPc(midi)],
    octave: Math.floor(midi / 12) - 1,
    fullName: `${PC_NAMES_SHARP[midiToPc(midi)]}${Math.floor(midi / 12) - 1}`,
    cents: (exact - midi) * 100,
  };
}

export interface StringTarget {
  /** Índice de cuerda, 0 = la más grave. */
  index: number;
  midi: Midi;
  /** "D", "G", "B", "E". */
  label: string;
  /** "D3", "G3"… */
  fullName: string;
  frequency: number;
}

/** Las cuerdas al aire de una afinación, con su frecuencia objetivo. */
export function stringTargets(tuning: Tuning, a4 = DEFAULT_A4): StringTarget[] {
  return tuning.strings.map((midi, index) => ({
    index,
    midi,
    label: tuning.labels[index],
    fullName: `${PC_NAMES_SHARP[midiToPc(midi)]}${Math.floor(midi / 12) - 1}`,
    frequency: midiToFrequency(midi, a4),
  }));
}

export interface StringMatch {
  target: StringTarget;
  /** Desvío respecto de esa cuerda (puede pasar de ±50 si está muy floja). */
  cents: number;
}

/**
 * Qué cuerda estás tocando.
 *
 * Se elige la más cercana en cents, pero solo si está dentro de `maxCents`:
 * una cuerda a más de tres semitonos de su nota no es "esa cuerda desafinada",
 * es otra nota, y decir lo contrario haría girar la clavija para el lado
 * equivocado.
 */
export function nearestString(
  frequency: number,
  targets: StringTarget[],
  maxCents = 350,
): StringMatch | null {
  let best: StringMatch | null = null;
  for (const target of targets) {
    const cents = centsBetween(frequency, target.frequency);
    if (!best || Math.abs(cents) < Math.abs(best.cents)) best = { target, cents };
  }
  if (!best || Math.abs(best.cents) > maxCents) return null;
  return best;
}

export type TuningVerdict = "afinada" | "baja" | "alta";

/** Tolerancia estándar de un afinador: ±5 cents no se distingue de oído. */
export const IN_TUNE_CENTS = 5;

export function verdictFor(cents: number, tolerance = IN_TUNE_CENTS): TuningVerdict {
  if (Math.abs(cents) <= tolerance) return "afinada";
  return cents < 0 ? "baja" : "alta";
}

/**
 * Qué hacer con la clavija.
 *
 * Cuando el desvío se sale del dial, el indicador queda pegado al borde y un
 * semitono entero parecería un error chiquito: por eso el texto avisa que hay
 * que girar bastante, no un toque.
 */
export function instructionFor(verdict: TuningVerdict, cents = 0): string {
  const far = Math.abs(cents) > 50;
  switch (verdict) {
    case "afinada":
      return "Afinada";
    case "baja":
      return far ? "Tensá bastante la cuerda" : "Tensá la cuerda";
    case "alta":
      return far ? "Aflojá bastante la cuerda" : "Aflojá la cuerda";
  }
}
