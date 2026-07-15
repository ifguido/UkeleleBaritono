/**
 * Detección de tonalidad por cobertura de la escala + cadencias.
 * Determinista y transparente: no cambia nunca la tonalidad de la canción.
 */

import { PitchClass, pcName } from "./notes";
import { ParsedChord, chordPitchClasses } from "./chords";

export interface DetectedKey {
  tonic: PitchClass;
  mode: "major" | "minor";
  name: string; // "E mayor", "C#m"
  confidence: number; // 0..1
  diatonicChords: string[];
  nonDiatonic: string[];
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

function scaleSet(tonic: PitchClass): Set<PitchClass> {
  return new Set(MAJOR_SCALE.map((s) => (tonic + s) % 12));
}

/** Tónicas con nombres habituales (evita Sol# mayor, prefiere Ab). */
const FLAT_MAJOR_TONICS = new Set([1, 3, 5, 8, 10]); // Db Eb F(no) Ab Bb — F es natural
const FLAT_MINOR_TONICS = new Set([3, 5, 10]); // Ebm Fm Bbm

const MAJOR_DEGREES: Record<number, string> = {
  0: "I", 1: "bII", 2: "II", 3: "bIII", 4: "III", 5: "IV",
  6: "#IV", 7: "V", 8: "bVI", 9: "VI", 10: "bVII", 11: "VII",
};
const MINOR_DEGREES: Record<number, string> = {
  0: "I", 1: "bII", 2: "II", 3: "III", 4: "#III", 5: "IV",
  6: "bV", 7: "V", 8: "VI", 9: "#VI", 10: "VII", 11: "#VII",
};

const MINOR_FAMILY = new Set(["minor", "m6", "m7", "m9", "m11", "madd9", "mMaj7", "dim", "dim7", "m7b5"]);

/** Función armónica del acorde en la tonalidad: "V7", "ii", "bIII"… */
export function romanNumeral(chord: ParsedChord, key: DetectedKey): string {
  const rel = ((chord.root - key.tonic) % 12 + 12) % 12;
  const table = key.mode === "minor" ? MINOR_DEGREES : MAJOR_DEGREES;
  let numeral = table[rel];
  let suffix = chord.formula.suffix;
  if (MINOR_FAMILY.has(chord.quality)) {
    numeral = numeral.replace(/[IV]+/, (m) => m.toLowerCase());
    suffix = suffix.replace(/^m(?![a-z])/, "");
  }
  if (chord.quality === "dim") suffix = "°";
  if (chord.quality === "dim7") suffix = "°7";
  if (chord.quality === "m7b5") suffix = "ø";
  if (chord.quality === "aug") suffix = "+";
  return numeral + suffix;
}

export function detectKey(chords: ParsedChord[]): DetectedKey | null {
  if (chords.length === 0) return null;

  // 1) Mejor escala mayor por cobertura de notas (ponderando dominantes: la
  //    sensible del V7 es diatónica, los préstamos restan).
  let bestTonic = 0;
  let bestScore = -1;
  for (let tonic = 0; tonic < 12; tonic++) {
    const scale = scaleSet(tonic);
    let score = 0;
    for (const chord of chords) {
      const pcs = [...chordPitchClasses(chord)];
      const inScale = pcs.filter((pc) => scale.has(pc)).length;
      score += inScale / pcs.length;
      // bonus por fundamental diatónica
      if (scale.has(chord.root)) score += 0.3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTonic = tonic;
    }
  }

  const scale = scaleSet(bestTonic);
  const relativeMinor = (bestTonic + 9) % 12;

  // 2) ¿Mayor o menor relativa? Decide por tónicas en posiciones fuertes.
  const first = chords[0];
  const last = chords[chords.length - 1];
  let minorVotes = 0;
  let majorVotes = 0;
  const isMinorTonic = (c: ParsedChord) =>
    c.root === relativeMinor && ["minor", "m7", "m9", "madd9"].includes(c.quality);
  const isMajorTonic = (c: ParsedChord) =>
    c.root === bestTonic && ["major", "maj7", "6", "add9", "69", "maj9", "5"].includes(c.quality);

  // La frecuencia bruta pesa poco: una canción puede insistir en el vi
  // (relativa menor) y aun así estar en mayor. Deciden las cadencias.
  for (const c of chords) {
    if (isMinorTonic(c)) minorVotes += 0.5;
    if (isMajorTonic(c)) majorVotes += 0.5;
  }
  if (isMinorTonic(first)) minorVotes += 3;
  if (isMajorTonic(first)) majorVotes += 3;
  if (isMinorTonic(last)) minorVotes += 4;
  if (isMajorTonic(last)) majorVotes += 4;
  // Cadencias dominante→tónica: la señal más fuerte de todas.
  // B7→E define E mayor aunque la relativa menor aparezca más veces.
  const DOMINANT_QUALITIES = ["7", "9", "13", "7sus4", "7b9", "7#9", "major"];
  for (let i = 0; i < chords.length - 1; i++) {
    const a = chords[i];
    const b = chords[i + 1];
    const isResolution = (b.root - a.root + 12) % 12 === 5; // 4ª justa ascendente
    if (!isResolution || !DOMINANT_QUALITIES.includes(a.quality)) continue;
    if (isMajorTonic(b)) majorVotes += 3;
    if (isMinorTonic(b)) minorVotes += 3;
  }
  // V7 de la menor (dominante secundaria de la relativa) es señal de modo menor
  const minorDominant = (relativeMinor + 7) % 12;
  for (const c of chords) {
    if (c.root === minorDominant && (c.quality === "7" || c.quality === "major") && !scale.has((c.root + 4) % 12)) {
      minorVotes += 1.5;
    }
  }

  const mode: "major" | "minor" = minorVotes > majorVotes ? "minor" : "major";
  const tonic = mode === "major" ? bestTonic : relativeMinor;
  const useFlats = mode === "major" ? FLAT_MAJOR_TONICS.has(tonic) : FLAT_MINOR_TONICS.has(tonic);

  const diatonic: string[] = [];
  const nonDiatonic: string[] = [];
  const seen = new Set<string>();
  for (const chord of chords) {
    if (seen.has(chord.normalized)) continue;
    seen.add(chord.normalized);
    const pcs = [...chordPitchClasses(chord)];
    const inScale = pcs.every((pc) => scale.has(pc));
    (inScale ? diatonic : nonDiatonic).push(chord.normalized);
  }

  const coverage = bestScore / (chords.length * 1.3);
  return {
    tonic,
    mode,
    name: `${pcName(tonic, useFlats)}${mode === "minor" ? "m" : ""} (${mode === "minor" ? "menor" : "mayor"})`,
    confidence: Math.round(Math.min(1, coverage) * 100) / 100,
    diatonicChords: diatonic,
    nonDiatonic,
  };
}
