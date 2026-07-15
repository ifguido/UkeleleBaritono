"use client";

import { DetectedKey, romanNumeral } from "@/lib/engine/key-detect";
import { OptimizeResult } from "@/lib/engine/optimizer";
import ChordDiagram from "./ChordDiagram";

interface Props {
  result: OptimizeResult;
  songKey: DetectedKey | null;
  selectedSymbol: string | null;
  onSelect: (occurrenceIndex: number) => void;
}

/**
 * Tira horizontal fija con los acordes de la canción, en orden de aparición.
 * Pensada para mobile: mientras leés la letra, tenés los acordes siempre a la
 * vista y a un toque. Tocar uno lo hace sonar y abre su detalle.
 */
export default function ChordStrip({ result, songKey, selectedSymbol, onSelect }: Props) {
  const entries = [...result.chordShapes.entries()];
  if (entries.length === 0) return null;

  return (
    <div className="no-print sticky top-0 z-30 -mx-4 border-b border-stone-200 bg-stone-50/95 px-4 py-2 backdrop-blur lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {entries.map(([symbol, voicings]) => {
          const first = result.occurrences.find(
            (o) => o.occurrence.chord.normalized === symbol,
          );
          if (!first) return null;
          const roman = songKey ? romanNumeral(first.occurrence.chord, songKey) : null;
          const active = symbol === selectedSymbol;
          return (
            <button
              key={symbol}
              onClick={() => onSelect(first.occurrence.index)}
              className={`flex shrink-0 flex-col items-center rounded-lg border px-2 py-1 transition-colors ${
                active
                  ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
                  : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold leading-none">{symbol}</span>
                {roman && <span className="text-[9px] text-stone-400">{roman}</span>}
              </div>
              <ChordDiagram frets={voicings[0].frets} barre={voicings[0].barre} size="sm" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
