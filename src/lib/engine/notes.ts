/**
 * Notas, pitch classes y afinación.
 * Todo el motor trabaja en pitch classes (0–11) y notas MIDI.
 */

export type PitchClass = number; // 0..11
export type Midi = number;

export const PC_NAMES_SHARP = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

export const PC_NAMES_FLAT = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
] as const;

const NATURAL_PC: Record<string, PitchClass> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/** Parsea "C#", "Db", "F##", "Bbb", "E" → pitch class. null si no es una nota. */
export function parseNoteName(name: string): PitchClass | null {
  const m = /^([A-Ga-g])(##|bb|#|b|♯|♭|x)?$/.exec(name.trim());
  if (!m) return null;
  let pc = NATURAL_PC[m[1].toUpperCase()];
  const acc = m[2];
  if (acc === "#" || acc === "♯") pc += 1;
  else if (acc === "b" || acc === "♭") pc -= 1;
  else if (acc === "##" || acc === "x") pc += 2;
  else if (acc === "bb") pc -= 2;
  return ((pc % 12) + 12) % 12;
}

/** Parsea "D3", "G3", "B3", "E4" → nota MIDI (C4 = 60). */
export function parseNoteWithOctave(name: string): Midi | null {
  const m = /^([A-Ga-g](?:##|bb|#|b|♯|♭)?)(-?\d)$/.exec(name.trim());
  if (!m) return null;
  const pc = parseNoteName(m[1]);
  if (pc === null) return null;
  const octave = parseInt(m[2], 10);
  return (octave + 1) * 12 + pc;
}

export function midiToPc(midi: Midi): PitchClass {
  return ((midi % 12) + 12) % 12;
}

export function pcName(pc: PitchClass, useFlats: boolean): string {
  return useFlats ? PC_NAMES_FLAT[pc] : PC_NAMES_SHARP[pc];
}

/** "E4", "G#3", etc. */
export function midiName(midi: Midi, useFlats: boolean): string {
  const octave = Math.floor(midi / 12) - 1;
  return pcName(midiToPc(midi), useFlats) + octave;
}

export interface Tuning {
  name: string;
  /** De la cuerda más grave a la más aguda. */
  strings: Midi[];
  /** Etiquetas para mostrar, ej. ["D", "G", "B", "E"]. */
  labels: string[];
}

/** Ukelele barítono estándar: D3–G3–B3–E4 (grave → agudo). */
export const BARITONE: Tuning = {
  name: "Ukelele barítono (D-G-B-E)",
  strings: [50, 55, 59, 64], // D3, G3, B3, E4
  labels: ["D", "G", "B", "E"],
};
