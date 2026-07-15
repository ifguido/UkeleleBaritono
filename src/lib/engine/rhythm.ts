/**
 * Estimación de la duración relativa de cada acorde.
 *
 * Dos fuentes, en orden de prioridad:
 * 1. Anotación explícita del usuario: "E*2" dura el doble, "B7*0.5" la mitad.
 * 2. El layout de la canción: en un chart con acordes sobre la letra, la
 *    distancia horizontal hasta el próximo acorde (y los saltos de línea)
 *    aproximan cuánto "texto" abarca cada acorde, y por lo tanto su duración.
 *
 * Las duraciones inferidas se cuantizan a medios tiempos (0.5, 1, 1.5, 2…)
 * para que el resultado suene musical y no arrastrado.
 */

import { ParsedSong } from "./song-parser";

export type RhythmMode = "uniform" | "layout";

export function estimateBeats(song: ParsedSong, mode: RhythmMode): number[] {
  const occs = song.occurrences;
  const explicit = occs.map((o) => o.beats ?? null);
  if (mode === "uniform" || occs.length < 3) {
    return explicit.map((b) => b ?? 1);
  }

  // Distancia "en texto" de cada acorde hasta el siguiente
  const gaps: number[] = [];
  for (let i = 0; i < occs.length; i++) {
    const cur = occs[i];
    const next = occs[i + 1];
    if (!next) {
      gaps.push(NaN);
      continue;
    }
    if (next.lineIndex === cur.lineIndex) {
      gaps.push(next.charIndex - cur.charIndex);
    } else {
      // El último acorde de la línea "abarca" hasta el final del verso;
      // el arranque de la línea siguiente pesa menos.
      const lineLength = song.lines[cur.lineIndex]?.text.length ?? cur.charIndex;
      gaps.push(Math.max(lineLength - cur.charIndex, 6) + next.charIndex * 0.4);
    }
  }

  const valid = gaps.filter((g) => !isNaN(g) && g > 0).sort((a, b) => a - b);
  if (valid.length < 2) return explicit.map((b) => b ?? 1);
  const median = valid[Math.floor(valid.length / 2)];
  if (median <= 0) return explicit.map((b) => b ?? 1);

  return occs.map((occ, i) => {
    if (explicit[i]) return explicit[i]!;
    const gap = gaps[i];
    if (isNaN(gap) || gap <= 0) return 1;
    const quantized = Math.round((gap / median) * 2) / 2;
    return Math.min(3, Math.max(0.5, quantized));
  });
}
