"use client";

import { DetectedKey, romanNumeral } from "@/lib/engine/key-detect";
import { OptimizeResult, OptimizedOccurrence } from "@/lib/engine/optimizer";
import ChordDiagram from "./ChordDiagram";

interface Props {
  result: OptimizeResult;
  songKey: DetectedKey | null;
  selected: OptimizedOccurrence | null;
  onSelectOccurrence: (index: number) => void;
  onOpenWorkbench: (index: number, editing: boolean) => void;
}

export default function ChordPanel({
  result,
  songKey,
  selected,
  onSelectOccurrence,
  onOpenWorkbench,
}: Props) {
  const selectedSymbol = selected?.occurrence.chord.normalized ?? "";

  return (
    <aside className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Acordes de la canción
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {[...result.chordShapes.entries()].flatMap(([symbol, voicings]) =>
          voicings.map((v) => {
            // Ocurrencias que usan EXACTAMENTE esta posición (no todo el símbolo):
            // así cada variación aparece con su digitación real.
            const occurrences = result.occurrences.filter(
              (o) => o.occurrence.chord.normalized === symbol && o.voicing.display === v.display,
            );
            const first = occurrences[0];
            if (!first) return null;
            const roman = songKey ? romanNumeral(first.occurrence.chord, songKey) : null;
            const active =
              symbol === selectedSymbol && selected?.voicing.display === v.display;
            const multiple = voicings.length > 1;
            return (
              <div
                key={symbol + v.display}
                className={`flex flex-col items-center rounded-lg border p-2 transition-colors ${
                  active ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600" : "border-stone-200 bg-white"
                }`}
              >
                {/* Cuerpo: clic = escuchar y resaltar esta variación (no abre nada) */}
                <button
                  onClick={() => onSelectOccurrence(first.occurrence.index)}
                  className="flex flex-col items-center"
                  title="Escuchar y resaltar en la letra"
                >
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold">{symbol}</span>
                    {roman && <span className="text-[10px] text-stone-400">{roman}</span>}
                  </div>
                  <ChordDiagram frets={v.frets} barre={v.barre} size="sm" />
                  <span className="font-mono text-[10px] text-stone-500">{v.display}</span>
                  <span className="text-[10px] text-stone-400">
                    {multiple ? `esta forma ×${occurrences.length}` : `×${occurrences.length}`}
                  </span>
                </button>

                <button
                  onClick={() => onOpenWorkbench(first.occurrence.index, true)}
                  className="mt-1.5 w-full rounded border border-stone-200 py-1 text-[10px] text-stone-500 hover:border-teal-500 hover:text-teal-700"
                >
                  Editar acorde
                </button>
              </div>
            );
          }),
        )}
      </div>
    </aside>
  );
}
