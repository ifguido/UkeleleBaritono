/**
 * Estimación de la duración relativa de cada acorde, en "tiempos".
 *
 * Prioridades:
 * 1. Override manual del usuario (stepper en el panel).
 * 2. Anotación explícita en el texto: "E*2" dura 2, "B7*0.5" dura 0.5.
 * 3. Layout de la canción: cuánto texto (letra) transcurre hasta el próximo
 *    acorde. Un acorde sobre el que pasa mucha letra —o una línea entera sin
 *    acordes debajo— SOSTIENE: dura más. Así, si el renglón siguiente arranca
 *    sin acorde, el anterior sigue sonando.
 *
 * Todo se cuantiza a medios tiempos para que suene musical.
 */

import { ParsedSong } from "./song-parser";

export type RhythmMode = "uniform" | "layout";

/** Posición absoluta de cada acorde en el "flujo de texto" de la canción. */
function flowPositions(song: ParsedSong): number[] {
  // Ancho de cada línea; +1 por el salto de renglón para que la letra que
  // pasa entre dos acordes de líneas distintas cuente como duración.
  const lineWidth = song.lines.map((l) => l.text.length + 1);
  const prefix: number[] = [0];
  for (let i = 0; i < lineWidth.length; i++) prefix.push(prefix[i] + lineWidth[i]);

  return song.occurrences.map((o) => prefix[o.lineIndex] + o.charIndex);
}

export function estimateBeats(
  song: ParsedSong,
  mode: RhythmMode,
  overrides: Record<number, number> = {},
): number[] {
  const occs = song.occurrences;
  const base = occs.map((o) => overrides[o.index] ?? o.beats ?? null);

  if (mode === "uniform" || occs.length < 3) {
    return base.map((b) => b ?? 1);
  }

  const pos = flowPositions(song);
  const gaps: number[] = [];
  for (let i = 0; i < occs.length; i++) {
    gaps.push(i + 1 < occs.length ? pos[i + 1] - pos[i] : NaN);
  }

  const valid = gaps.filter((g) => !isNaN(g) && g > 0).sort((a, b) => a - b);
  if (valid.length < 2) return base.map((b) => b ?? 1);
  const median = valid[Math.floor(valid.length / 2)] || 1;

  return occs.map((occ, i) => {
    if (base[i] != null) return base[i]!;
    const gap = gaps[i];
    if (isNaN(gap) || gap <= 0) return 1;
    const quantized = Math.round((gap / median) * 2) / 2;
    return Math.min(8, Math.max(0.5, quantized));
  });
}
