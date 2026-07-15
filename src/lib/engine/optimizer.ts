/**
 * Optimizador global de digitaciones.
 *
 * No elige cada acorde de forma aislada: modela la canción como una
 * secuencia y busca el camino de costo mínimo (programación dinámica)
 * combinando costo intrínseco de cada voicing y costo de transición
 * entre voicings consecutivos.
 *
 * La corrección armónica NO es parte del puntaje: los candidatos ya
 * vienen validados por el motor; aquí solo se elige entre voicings válidos.
 */

import { ParsedChord } from "./chords";
import { ChordOccurrence } from "./song-parser";
import {
  Voicing,
  VoicingOptions,
  generateVoicings,
  recommendScore,
} from "./voicings";

export type OptimizeMode = "auto" | "easy" | "balanced" | "faithful" | "advanced";

interface Weights {
  intrinsic: number;
  transition: number;
  inversionPenalty: number;
  omissionPenalty: number;
  heightPenalty: number;
  openBonus: number;
  fewStringsPenalty: number;
  maxCandidates: number;
}

const MODE_WEIGHTS: Record<Exclude<OptimizeMode, "auto">, Weights> = {
  easy: {
    intrinsic: 1.7,
    transition: 1.0,
    inversionPenalty: 1.4,
    omissionPenalty: 0.25,
    heightPenalty: 0.4,
    openBonus: 0.45,
    fewStringsPenalty: 0.2,
    maxCandidates: 12,
  },
  balanced: {
    intrinsic: 1.0,
    transition: 1.0,
    inversionPenalty: 1.5,
    omissionPenalty: 0.7,
    heightPenalty: 0.18,
    openBonus: 0.25,
    fewStringsPenalty: 0.35,
    maxCandidates: 14,
  },
  faithful: {
    intrinsic: 0.7,
    transition: 0.8,
    inversionPenalty: 2.6,
    omissionPenalty: 2.2,
    heightPenalty: 0.06,
    openBonus: 0.1,
    fewStringsPenalty: 0.6,
    maxCandidates: 18,
  },
  advanced: {
    intrinsic: 0.55,
    transition: 1.3,
    inversionPenalty: 0.5,
    omissionPenalty: 0.8,
    heightPenalty: 0,
    openBonus: 0.05,
    fewStringsPenalty: 0.3,
    maxCandidates: 20,
  },
};

export interface OptimizedOccurrence {
  occurrence: ChordOccurrence;
  voicing: Voicing;
  alternatives: Voicing[];
  reason: string;
  locked: boolean;
}

export interface UnplayableChord {
  chord: ParsedChord;
  message: string;
}

export interface OptimizeResult {
  occurrences: OptimizedOccurrence[];
  /** Voicings por símbolo (para el resumen de diagramas). */
  chordShapes: Map<string, Voicing[]>;
  unplayable: UnplayableChord[];
  totalCost: number;
}

export interface OptimizeOptions {
  mode?: OptimizeMode;
  voicingOptions?: VoicingOptions;
  /** occurrenceIndex → display del voicing fijado por el usuario. */
  locks?: Record<number, string>;
}

function intrinsicCost(v: Voicing, w: Weights): number {
  let cost = v.difficulty * w.intrinsic;
  cost += v.omitted.length * w.omissionPenalty;
  if (v.bassDegree !== "1" && !v.inversion.includes("slash")) cost += w.inversionPenalty;
  cost += v.unisonCount * 0.9; // unísonos: cuerda desperdiciada, sonido chato
  cost += v.avgFret * w.heightPenalty;
  cost -= v.openCount * w.openBonus;
  cost += (4 - v.soundingCount) * w.fewStringsPenalty;
  return cost;
}

function transitionCost(a: Voicing, b: Voicing, w: Weights): number {
  let cost = 0;
  for (let i = 0; i < a.frets.length; i++) {
    const fa = a.frets[i];
    const fb = b.frets[i];
    if (fa === null || fb === null) cost += fa === fb ? 0 : 0.15;
    else if (fa === 0 || fb === 0) cost += fa === fb ? 0 : 0.2;
    else if (fa === fb) cost -= 0.15; // dedo ancla: se mantiene apoyado
    else cost += Math.abs(fa - fb) * 0.3;
  }
  // desplazamiento de la mano
  cost += Math.abs(a.avgFret - b.avgFret) * 0.55;
  // conducción de voces: bajo y soprano
  cost += Math.abs(a.bassMidi - b.bassMidi) * 0.05;
  cost += Math.abs(a.topMidi - b.topMidi) * 0.035;
  // El ahorro por anclas nunca vuelve "gratis" una forma incómoda:
  // la transición no puede ser negativa.
  return Math.max(0, cost) * w.transition;
}

function buildReason(
  v: Voicing,
  prev: Voicing | null,
  sameSymbolPrev: Voicing | null,
): string {
  const parts: string[] = [];
  if (sameSymbolPrev && sameSymbolPrev.display === v.display) {
    parts.push("misma posición que la aparición anterior");
  } else if (v.openCount >= 2 && v.maxFretUsed <= 3) {
    parts.push("posición abierta cómoda");
  } else if (v.barre) {
    parts.push(`cejilla en traste ${v.barre.fret}`);
  }
  if (v.bassDegree === "1") parts.push("fundamental en el bajo");
  else if (v.inversion.includes("slash")) parts.push("respeta el bajo indicado");
  else if (v.bassDegree) parts.push(v.inversion);
  if (v.omitted.length) parts.push(`se omite ${v.omitted.join(" y ")}`);
  if (prev && Math.abs(prev.avgFret - v.avgFret) <= 1.5 && v.minFret > 3) {
    parts.push("la mano se queda en la misma zona");
  }
  const text = parts.join("; ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}

/**
 * Elige la secuencia de voicings de costo global mínimo.
 */
export function optimizeProgression(
  occurrences: ChordOccurrence[],
  options: OptimizeOptions = {},
): OptimizeResult {
  const mode = options.mode && options.mode !== "auto" ? options.mode : "balanced";
  const w = MODE_WEIGHTS[mode];
  const vOptions: VoicingOptions = { ...options.voicingOptions };
  if (mode === "easy") vOptions.maxFret = Math.min(vOptions.maxFret ?? 7, 7);
  if (mode === "faithful") vOptions.allowOmittedFifth = false;

  // Candidatos por símbolo (cache) — el modo fiel exige acordes completos,
  // pero si no existen voicings completos se relaja con etiqueta clara.
  const candidateCache = new Map<string, Voicing[]>();
  const unplayable: UnplayableChord[] = [];

  const candidatesFor = (chord: ParsedChord): Voicing[] => {
    const key = chord.normalized;
    const cached = candidateCache.get(key);
    if (cached) return cached;
    let list = generateVoicings(chord, vOptions);
    if (list.length === 0 && vOptions.allowOmittedFifth === false) {
      list = generateVoicings(chord, { ...vOptions, allowOmittedFifth: true });
    }
    if (list.length === 0 && (vOptions.maxFret ?? 12) < 12) {
      list = generateVoicings(chord, { ...vOptions, maxFret: 12 });
    }
    if (list.length === 0) {
      list = generateVoicings(chord, {
        ...vOptions,
        maxFret: 12,
        allowOmittedFifth: true,
        allowOmittedRoot: true,
        minStrings: 2,
      });
    }
    const top = list.slice(0, w.maxCandidates);
    candidateCache.set(key, top);
    return top;
  };

  const n = occurrences.length;
  const allCandidates: Voicing[][] = [];
  for (const occ of occurrences) {
    let cands = candidatesFor(occ.chord);
    const lock = options.locks?.[occ.index];
    if (lock) {
      const full = generateVoicings(occ.chord, { ...vOptions, maxFret: 12 });
      const locked = full.find((v) => v.display === lock) ?? cands.find((v) => v.display === lock);
      if (locked) cands = [locked];
    }
    if (cands.length === 0) {
      unplayable.push({
        chord: occ.chord,
        message: `No encontré ninguna posición tocable para ${occ.chord.normalized} con la configuración actual. Probá subir el traste máximo en Avanzado.`,
      });
    }
    allCandidates.push(cands);
  }

  // Programación dinámica sobre la secuencia
  const cost: number[][] = [];
  const back: number[][] = [];
  for (let i = 0; i < n; i++) {
    const cands = allCandidates[i];
    cost.push(new Array(cands.length).fill(Infinity));
    back.push(new Array(cands.length).fill(-1));
    for (let j = 0; j < cands.length; j++) {
      const intrinsic = intrinsicCost(cands[j], w);
      if (i === 0 || allCandidates[i - 1].length === 0) {
        cost[i][j] = intrinsic;
        continue;
      }
      for (let k = 0; k < allCandidates[i - 1].length; k++) {
        if (!isFinite(cost[i - 1][k])) continue;
        const total =
          cost[i - 1][k] + intrinsic + transitionCost(allCandidates[i - 1][k], cands[j], w);
        if (total < cost[i][j]) {
          cost[i][j] = total;
          back[i][j] = k;
        }
      }
      if (!isFinite(cost[i][j])) cost[i][j] = intrinsic;
    }
  }

  // Backtracking por segmentos (un acorde sin candidatos corta la cadena)
  const chosen: number[] = new Array(n).fill(-1);
  let totalCost = 0;
  let i = n - 1;
  while (i >= 0) {
    if (allCandidates[i].length === 0) {
      i--;
      continue;
    }
    let best = 0;
    for (let j = 1; j < cost[i].length; j++) if (cost[i][j] < cost[i][best]) best = j;
    chosen[i] = best;
    totalCost += cost[i][best];
    let k = i;
    while (k > 0 && back[k][chosen[k]] !== -1) {
      chosen[k - 1] = back[k][chosen[k]];
      k--;
    }
    i = k - 1;
  }

  const result: OptimizedOccurrence[] = [];
  const lastVoicingBySymbol = new Map<string, Voicing>();
  let prevVoicing: Voicing | null = null;
  for (let i = 0; i < n; i++) {
    const occ = occurrences[i];
    const cands = allCandidates[i];
    if (chosen[i] === -1 || cands.length === 0) continue;
    const voicing = cands[chosen[i]];
    const alternatives = candidatesFor(occ.chord).filter((v) => v.display !== voicing.display);
    result.push({
      occurrence: occ,
      voicing,
      alternatives,
      reason: buildReason(voicing, prevVoicing, lastVoicingBySymbol.get(occ.chord.normalized) ?? null),
      locked: Boolean(options.locks?.[occ.index]),
    });
    lastVoicingBySymbol.set(occ.chord.normalized, voicing);
    prevVoicing = voicing;
  }

  // Formas usadas por símbolo, para el resumen
  const chordShapes = new Map<string, Voicing[]>();
  for (const r of result) {
    const key = r.occurrence.chord.normalized;
    const list = chordShapes.get(key) ?? [];
    if (!list.some((v) => v.display === r.voicing.display)) list.push(r.voicing);
    chordShapes.set(key, list);
  }

  return { occurrences: result, chordShapes, unplayable, totalCost };
}

export { recommendScore };
