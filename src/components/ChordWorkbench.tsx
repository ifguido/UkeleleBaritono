"use client";

import { useEffect, useState } from "react";
import { parseChordFlexible } from "@/lib/engine/chords";
import { DetectedKey, romanNumeral } from "@/lib/engine/key-detect";
import { OptimizeResult, OptimizedOccurrence } from "@/lib/engine/optimizer";
import { Voicing } from "@/lib/engine/voicings";
import { playArpeggio, playChord } from "@/lib/audio/synth";
import ChordDiagram from "./ChordDiagram";
import { difficultyLabel } from "./VoicingCard";

interface Props {
  working: OptimizedOccurrence;
  songKey: DetectedKey | null;
  locks: Record<number, string>;
  result: OptimizeResult;
  beats?: number;
  startEditing?: boolean;
  onApply: (occurrenceIndex: number, display: string, wholeSong: boolean) => void;
  onClearLocks: (symbol: string) => void;
  onEditChord: (occurrenceIndex: number, newSymbol: string, wholeSong: boolean) => void;
  onRevertEdit: (occurrenceIndex: number) => void;
  onSetBeats: (occurrenceIndex: number, beats: number) => void;
  onClose: () => void;
}

function MiniVoicing({
  voicing,
  onUseEverywhere,
  onUseHere,
}: {
  voicing: Voicing;
  onUseEverywhere: () => void;
  onUseHere: () => void;
}) {
  const diff = difficultyLabel(voicing.difficulty);
  return (
    <div className="flex flex-col items-center rounded-lg border border-stone-200 bg-white p-2">
      <span className={`self-start rounded px-1 text-[10px] font-medium ${diff.className}`}>
        {voicing.difficulty}
      </span>
      <button onClick={() => playChord(voicing.midiNotes)} title="Escuchar esta posición">
        <ChordDiagram frets={voicing.frets} barre={voicing.barre} size="lg" />
      </button>
      <span className="font-mono text-xs text-stone-600">{voicing.display}</span>
      {voicing.omitted.length > 0 && (
        <span className="text-center text-[10px] font-medium text-orange-700">
          omite {voicing.omitted.map((o) => o.split(" ")[0]).join(", ")}
        </span>
      )}
      {voicing.bassDegree !== "1" && (
        <span className="text-center text-[10px] text-stone-400">{voicing.inversion}</span>
      )}
      <div className="mt-1.5 flex w-full flex-col gap-1">
        <button
          onClick={onUseEverywhere}
          className="rounded bg-teal-700 px-1 py-1 text-[11px] font-medium text-white hover:bg-teal-800"
        >
          Usar en toda la canción
        </button>
        <button
          onClick={onUseHere}
          className="rounded border border-stone-300 px-1 py-1 text-[11px] text-stone-600 hover:bg-stone-100"
        >
          Solo aquí
        </button>
      </div>
    </div>
  );
}

export default function ChordWorkbench({
  working,
  songKey,
  locks,
  result,
  beats = 1,
  startEditing = false,
  onApply,
  onClearLocks,
  onEditChord,
  onRevertEdit,
  onSetBeats,
  onClose,
}: Props) {
  const symbol = working.occurrence.chord.normalized;
  const index = working.occurrence.index;
  const v = working.voicing;

  const [editValue, setEditValue] = useState(symbol);
  const [editError, setEditError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(startEditing);

  useEffect(() => {
    setEditValue(symbol);
    setEditError(null);
  }, [symbol, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const applyEdit = (wholeSong: boolean) => {
    const value = editValue.trim();
    if (!value || value === symbol) return;
    const parsed = parseChordFlexible(value);
    if (!parsed.ok) {
      setEditError(parsed.error.message);
      return;
    }
    setEditError(null);
    onEditChord(index, value, wholeSong);
  };

  const roman = songKey ? romanNumeral(working.occurrence.chord, songKey) : null;
  const isDiatonic = songKey ? !songKey.nonDiatonic.includes(symbol) : true;
  const occurrencesOfSymbol = result.occurrences.filter(
    (o) => o.occurrence.chord.normalized === symbol,
  );
  const symbolHasLocks = occurrencesOfSymbol.some((o) => locks[o.occurrence.index]);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-stone-50 p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-bold">{symbol}</h2>
            {roman && (
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  isDiatonic ? "bg-stone-100 text-stone-600" : "bg-purple-100 text-purple-800"
                }`}
              >
                {roman}
                {!isDiatonic && " · prestado"}
              </span>
            )}
            <span className="text-xs text-stone-400">×{occurrencesOfSymbol.length} en la canción</span>
          </div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-stone-500 hover:bg-stone-200"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Posición actual + controles */}
        <div className="mb-4 flex flex-wrap items-start gap-4 rounded-lg border border-teal-600 bg-teal-50/40 p-4">
          <ChordDiagram frets={v.frets} barre={v.barre} size="xl" />
          <div className="min-w-0 flex-1 space-y-1 text-sm text-stone-700">
            <div className="font-mono text-base font-semibold text-stone-800">{v.display}</div>
            <div>{v.noteNames.join(" ")}</div>
            <div className="text-stone-500">
              Bajo {v.bassNote} · {v.inversion}
            </div>
            {v.omitted.length > 0 && (
              <div className="font-medium text-orange-700">Omite {v.omitted.join(", ")}</div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => playChord(v.midiNotes)}
                className="rounded border border-teal-600 px-3 py-1 text-sm text-teal-800 hover:bg-teal-600 hover:text-white"
              >
                ▶ Rasgueo
              </button>
              <button
                onClick={() => playArpeggio(v.midiNotes)}
                className="rounded border border-stone-300 px-3 py-1 text-sm text-stone-600 hover:bg-stone-100"
              >
                ♪ Arpegio
              </button>
            </div>
            <div className="flex items-center gap-1.5 pt-1 text-sm">
              <span className="text-stone-500">Duración:</span>
              <button
                onClick={() => onSetBeats(index, Math.max(0.5, beats - 0.5))}
                className="h-7 w-7 rounded border border-stone-300 text-stone-600 hover:bg-stone-100"
              >
                −
              </button>
              <span className="w-16 text-center font-mono">
                {beats} {beats === 1 ? "tiempo" : "tiempos"}
              </span>
              <button
                onClick={() => onSetBeats(index, Math.min(8, beats + 0.5))}
                className="h-7 w-7 rounded border border-stone-300 text-stone-600 hover:bg-stone-100"
              >
                +
              </button>
            </div>
            {symbolHasLocks && (
              <button
                onClick={() => onClearLocks(symbol)}
                className="text-xs text-amber-700 underline-offset-2 hover:underline"
              >
                🔓 Volver a la elección automática
              </button>
            )}
          </div>
        </div>

        {/* Cambiar acorde */}
        <div className="mb-4">
          <button
            onClick={() => setEditOpen((o) => !o)}
            className="text-sm text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
          >
            {editOpen ? "▲ Cerrar edición" : "✎ Cambiar este acorde (por ej. E → E7)"}
          </button>
          {editOpen && (
            <div className="mt-2 rounded-lg border border-stone-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    setEditError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && applyEdit(true)}
                  className="w-28 rounded border border-stone-300 bg-white px-2 py-1.5 font-mono text-sm outline-none focus:border-teal-600"
                />
                <button
                  onClick={() => applyEdit(true)}
                  disabled={editValue.trim() === symbol || !editValue.trim()}
                  className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40"
                >
                  Todos los {working.occurrence.originalSymbol ?? symbol}
                </button>
                <button
                  onClick={() => applyEdit(false)}
                  disabled={editValue.trim() === symbol || !editValue.trim()}
                  className="rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-40"
                >
                  Solo esta aparición
                </button>
              </div>
              {editError && <p className="mt-1 text-sm text-rose-700">{editError}</p>}
              {working.occurrence.originalSymbol && (
                <button
                  onClick={() => onRevertEdit(index)}
                  className="mt-2 text-xs text-amber-700 underline-offset-2 hover:underline"
                >
                  ↩ Volver al original ({working.occurrence.originalSymbol})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Otras posiciones */}
        {working.alternatives.length > 0 && (
          <>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Otras posiciones ({working.alternatives.length}) — elegí una para reemplazar
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {working.alternatives.map((alt) => (
                <MiniVoicing
                  key={alt.display}
                  voicing={alt}
                  onUseEverywhere={() => onApply(index, alt.display, true)}
                  onUseHere={() => onApply(index, alt.display, false)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
