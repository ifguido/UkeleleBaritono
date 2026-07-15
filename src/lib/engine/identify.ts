/**
 * Identificador inverso: dada una digitación, ¿qué acorde es?
 */

import { Tuning, BARITONE, midiToPc, pcName, PC_NAMES_SHARP } from "./notes";
import { FORMULAS, parseChord, ParsedChord } from "./chords";
import { Fret, Voicing, validateVoicing } from "./voicings";

export interface ChordMatch {
  symbol: string;
  chord: ParsedChord;
  quality: string;
  /** 1 = coincidencia exacta con fundamental en el bajo. */
  confidence: number;
  exact: boolean;
  omitted: string[];
  inversion: string;
  isInversion: boolean;
  voicing: Voicing;
}

export interface IdentifyResult {
  noteNames: string[];
  matches: ChordMatch[];
}

/** Complejidad de cada calidad: para preferir nombres simples ante empate. */
const QUALITY_COMPLEXITY: Record<string, number> = {
  major: 0, minor: 0, "5": 1, "7": 1, m7: 1, maj7: 1, dim: 1, aug: 1,
  sus2: 1, sus4: 1, "6": 2, m6: 2, dim7: 2, m7b5: 2, add9: 2, madd9: 2,
  mMaj7: 3, "9": 3, maj9: 3, m9: 3, "69": 3, "7sus4": 3,
};

export function identifyChord(frets: Fret[], tuning: Tuning = BARITONE): IdentifyResult {
  const sounding = frets
    .map((fret, idx) => ({ fret, idx }))
    .filter((s): s is { fret: number; idx: number } => s.fret !== null);
  const midiNotes = sounding.map((s) => tuning.strings[s.idx] + s.fret);
  const pcs = [...new Set(midiNotes.map(midiToPc))];
  const noteNames = midiNotes.map((m) => pcName(midiToPc(m), false));
  if (pcs.length === 0) return { noteNames: [], matches: [] };

  const bassPc = midiToPc(Math.min(...midiNotes));
  const matches: ChordMatch[] = [];

  // Probar cada nota presente como fundamental, con cada fórmula
  for (const root of pcs) {
    for (const quality of Object.keys(FORMULAS)) {
      const formula = FORMULAS[quality];
      const chordSemis = new Set(formula.intervals.map((i) => i.semitones));
      const presentSemis = new Set(pcs.map((pc) => ((pc - root) % 12 + 12) % 12));

      // Sin notas ajenas a la fórmula
      let foreign = false;
      for (const semis of presentSemis) if (!chordSemis.has(semis)) foreign = true;
      if (foreign) continue;

      // Deben estar las notas requeridas
      let missingRequired = false;
      for (const semis of formula.required) {
        if (!presentSemis.has(semis)) missingRequired = true;
      }
      if (missingRequired) continue;

      const symbol = PC_NAMES_SHARP[root] + formula.suffix;
      const parsed = parseChord(symbol);
      if (!parsed.ok) continue;
      const report = validateVoicing(parsed.chord, frets, {
        tuning,
        minStrings: 1,
        allowInteriorMutes: true,
        maxSpan: 24,
      });
      if (!report.valid) continue;

      const exact = report.status === "exact";
      const isInversion = bassPc !== root;
      let confidence = 1;
      if (!exact) confidence -= 0.15 * report.voicing.omitted.length;
      if (isInversion) confidence -= 0.2;
      confidence -= (QUALITY_COMPLEXITY[quality] ?? 4) * 0.02;
      // Cobertura: cuántas notas de la fórmula están presentes
      confidence -= (chordSemis.size - presentSemis.size) * 0.05;

      matches.push({
        symbol: isInversion ? `${symbol}/${PC_NAMES_SHARP[bassPc]}` : symbol,
        chord: parsed.chord,
        quality,
        confidence: Math.round(Math.max(0, confidence) * 100) / 100,
        exact,
        omitted: report.voicing.omitted,
        inversion: report.voicing.inversion,
        isInversion,
        voicing: report.voicing,
      });
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  return { noteNames, matches };
}
