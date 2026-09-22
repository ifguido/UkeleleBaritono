import { ParsedChord } from "@core/engine/chords";
import { Voicing, generateVoicings } from "@core/engine/voicings";

/** Los voicings de un acorde no cambian nunca: se calculan una sola vez. */
const cache = new Map<string, Voicing | null>();

export function bestVoicing(chord: ParsedChord): Voicing | null {
  const key = chord.normalized;
  if (cache.has(key)) return cache.get(key)!;
  const best = generateVoicings(chord)[0] ?? null;
  cache.set(key, best);
  return best;
}
