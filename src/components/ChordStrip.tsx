"use client";

import { useEffect, useRef } from "react";
import { DetectedKey, romanNumeral } from "@/lib/engine/key-detect";
import { OptimizeResult, OptimizedOccurrence } from "@/lib/engine/optimizer";
import ChordDiagram from "./ChordDiagram";

interface Props {
  result: OptimizeResult;
  songKey: DetectedKey | null;
  selected: OptimizedOccurrence | null;
  onSelect: (occurrenceIndex: number) => void;
  onOpenWorkbench: (index: number, editing: boolean) => void;
}

/**
 * Tira horizontal fija con los acordes de la canción, en orden de aparición
 * y por cada posición usada. Para mobile: seguís la letra con los acordes
 * siempre a la vista. Tocar uno lleva la letra hasta ahí y lo hace sonar;
 * el botón "Editar" abre la vista de trabajo.
 */
export default function ChordStrip({ result, songKey, selected, onSelect, onOpenWorkbench }: Props) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Al seleccionar un acorde (desde la letra o donde sea), la tira se desplaza
  // horizontalmente para mostrar la card correspondiente.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected?.occurrence.index]);

  const cards = [...result.chordShapes.entries()].flatMap(([symbol, voicings]) =>
    voicings.map((v) => {
      const first = result.occurrences.find(
        (o) => o.occurrence.chord.normalized === symbol && o.voicing.display === v.display,
      );
      return first ? { symbol, voicing: v, first } : null;
    }),
  );
  if (cards.length === 0) return null;

  const selectedSymbol = selected?.occurrence.chord.normalized ?? null;

  return (
    <div className="no-print sticky top-0 z-30 -mx-4 border-b border-stone-200 bg-stone-50/95 px-4 py-2 backdrop-blur lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {cards.map((c) => {
          if (!c) return null;
          const { symbol, voicing, first } = c;
          const roman = songKey ? romanNumeral(first.occurrence.chord, songKey) : null;
          const active =
            symbol === selectedSymbol && selected?.voicing.display === voicing.display;
          return (
            <button
              key={symbol + voicing.display}
              ref={active ? activeRef : null}
              onClick={() => onSelect(first.occurrence.index)}
              className={`flex shrink-0 flex-col items-center rounded-lg border px-2 py-1 transition-colors ${
                active ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold leading-none">{symbol}</span>
                {roman && <span className="text-[9px] text-stone-400">{roman}</span>}
              </div>
              <ChordDiagram frets={voicing.frets} barre={voicing.barre} size="sm" />
            </button>
          );
        })}
      </div>

      {/* Barra de acción del acorde seleccionado */}
      {selected && (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          <span className="font-semibold text-stone-700">{selectedSymbol}</span>
          <button
            onClick={() => onOpenWorkbench(selected.occurrence.index, true)}
            className="rounded border border-teal-600 bg-teal-50 px-2 py-0.5 font-medium text-teal-800 hover:bg-teal-100"
          >
            ✎ Editar acorde
          </button>
        </div>
      )}
    </div>
  );
}
