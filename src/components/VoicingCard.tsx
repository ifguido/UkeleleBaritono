"use client";

import { Voicing } from "@/lib/engine/voicings";
import { playArpeggio, playChord } from "@/lib/audio/synth";
import ChordDiagram from "./ChordDiagram";

interface Props {
  symbol: string;
  voicing: Voicing;
  highlight?: boolean;
  compact?: boolean;
  footer?: React.ReactNode;
}

export function difficultyLabel(d: number): { text: string; className: string } {
  if (d <= 1.6) return { text: "fácil", className: "bg-emerald-100 text-emerald-800" };
  if (d <= 3.2) return { text: "media", className: "bg-amber-100 text-amber-800" };
  return { text: "difícil", className: "bg-rose-100 text-rose-800" };
}

export default function VoicingCard({ symbol, voicing, highlight, compact, footer }: Props) {
  const diff = difficultyLabel(voicing.difficulty);
  return (
    <div
      className={`flex h-full flex-col rounded-lg border bg-white p-3 ${
        highlight ? "border-teal-600 ring-1 ring-teal-600" : "border-stone-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{symbol}</div>
          <div className="font-mono text-sm text-stone-600">{voicing.display}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${diff.className}`}>
            {diff.text} · {voicing.difficulty}
          </span>
          {voicing.exact ? (
            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">exacto</span>
          ) : (
            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[11px] font-medium text-orange-800">
              parcial
            </span>
          )}
        </div>
      </div>

      <div className="my-1 flex min-h-28 items-center justify-center">
        <ChordDiagram frets={voicing.frets} barre={voicing.barre} size={compact ? "sm" : "lg"} />
      </div>

      <div className="space-y-0.5 text-xs text-stone-600">
        <div>
          <span className="text-stone-400">Notas: </span>
          {voicing.noteNames.join(" ")}
        </div>
        <div>
          <span className="text-stone-400">Intervalos: </span>
          {voicing.intervals.join("–")}
        </div>
        <div>
          <span className="text-stone-400">Bajo: </span>
          {voicing.bassNote} · {voicing.inversion}
        </div>
        {voicing.omitted.length > 0 && (
          <div className="font-medium text-orange-700">Omitida: {voicing.omitted.join(", ")}</div>
        )}
        {voicing.added.length > 0 && (
          <div className="font-medium text-orange-700">Añadida: {voicing.added.join(", ")}</div>
        )}
        {voicing.barre && (
          <div>
            <span className="text-stone-400">Cejilla: </span>traste {voicing.barre.fret}
          </div>
        )}
      </div>

      <div className="no-print mt-auto flex gap-2 pt-2">
        <button
          onClick={() => playChord(voicing.midiNotes)}
          className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-100"
        >
          ▶ Rasgueo
        </button>
        <button
          onClick={() => playArpeggio(voicing.midiNotes)}
          className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-100"
        >
          ♪ Arpegio
        </button>
      </div>
      {footer}
    </div>
  );
}
