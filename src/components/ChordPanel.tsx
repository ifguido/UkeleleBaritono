"use client";

import { useEffect, useState } from "react";
import { parseChordFlexible } from "@/lib/engine/chords";
import { DetectedKey, romanNumeral } from "@/lib/engine/key-detect";
import { OptimizeResult, OptimizedOccurrence } from "@/lib/engine/optimizer";
import { ParsedSong } from "@/lib/engine/song-parser";
import { Voicing } from "@/lib/engine/voicings";
import { playArpeggio, playChord } from "@/lib/audio/synth";
import ChordDiagram from "./ChordDiagram";
import { difficultyLabel } from "./VoicingCard";

interface Props {
  song: ParsedSong;
  result: OptimizeResult;
  songKey: DetectedKey | null;
  selected: OptimizedOccurrence | null;
  locks: Record<number, string>;
  onSelectOccurrence: (index: number) => void;
  onApply: (occurrenceIndex: number, display: string, wholeSong: boolean) => void;
  onClearLocks: (symbol: string) => void;
  onEditChord: (occurrenceIndex: number, newSymbol: string, wholeSong: boolean) => void;
  onRevertEdit: (occurrenceIndex: number) => void;
  /** Duración en tiempos de la ocurrencia seleccionada. */
  selectedBeats?: number;
  onSetBeats: (occurrenceIndex: number, beats: number) => void;
  onClose: () => void;
}

function MiniVoicing({
  voicing,
  active,
  onUseEverywhere,
  onUseHere,
}: {
  voicing: Voicing;
  active?: boolean;
  onUseEverywhere?: () => void;
  onUseHere?: () => void;
}) {
  const diff = difficultyLabel(voicing.difficulty);
  return (
    <div
      className={`flex flex-col items-center rounded-lg border p-2 ${
        active ? "border-teal-600 bg-teal-50/60 ring-1 ring-teal-600" : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex w-full items-center justify-between gap-1">
        <span className={`rounded px-1 text-[10px] font-medium ${diff.className}`}>{voicing.difficulty}</span>
        <button
          onClick={() => playChord(voicing.midiNotes)}
          title="Escuchar"
          className="rounded-full border border-teal-200 px-1.5 text-[11px] text-teal-700 hover:bg-teal-600 hover:text-white"
        >
          ▶
        </button>
      </div>
      <ChordDiagram frets={voicing.frets} barre={voicing.barre} size="sm" />
      <span className="font-mono text-[11px] text-stone-600">{voicing.display}</span>
      {voicing.omitted.length > 0 && (
        <span className="text-center text-[10px] font-medium text-orange-700">
          omite {voicing.omitted.map((o) => o.split(" ")[0]).join(", ")}
        </span>
      )}
      {voicing.bassDegree !== "1" && (
        <span className="text-center text-[10px] text-stone-400">{voicing.inversion}</span>
      )}
      {!active && onUseEverywhere && (
        <div className="mt-1.5 flex w-full flex-col gap-1">
          <button
            onClick={onUseEverywhere}
            className="rounded bg-teal-700 px-1 py-0.5 text-[11px] font-medium text-white hover:bg-teal-800"
          >
            Usar en toda la canción
          </button>
          <button
            onClick={onUseHere}
            className="rounded border border-stone-300 px-1 py-0.5 text-[11px] text-stone-600 hover:bg-stone-100"
          >
            Solo aquí
          </button>
        </div>
      )}
      {active && <span className="mt-1 text-[10px] font-medium text-teal-700">posición actual</span>}
    </div>
  );
}

export default function ChordPanel({
  song,
  result,
  songKey,
  selected,
  locks,
  onSelectOccurrence,
  onApply,
  onClearLocks,
  onEditChord,
  onRevertEdit,
  selectedBeats,
  onSetBeats,
  onClose,
}: Props) {
  const selectedSymbol = selected?.occurrence.chord.normalized ?? "";
  const selectedIndex = selected?.occurrence.index ?? -1;
  const [editValue, setEditValue] = useState(selectedSymbol);
  const [editError, setEditError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setEditValue(selectedSymbol);
    setEditError(null);
    setEditOpen(false);
  }, [selectedSymbol, selectedIndex]);

  const applyEdit = (wholeSong: boolean) => {
    const value = editValue.trim();
    if (!value || !selected) return;
    if (value === selectedSymbol) return;
    const parsed = parseChordFlexible(value);
    if (!parsed.ok) {
      setEditError(parsed.error.message);
      return;
    }
    setEditError(null);
    onEditChord(selected.occurrence.index, value, wholeSong);
  };

  // ── Estado sin selección: grilla de acordes de la canción ──
  if (!selected) {
    return (
      <aside className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Acordes de la canción
        </h2>
        <p className="mb-3 text-xs text-stone-400">
          Tocá un acorde (acá o en la letra) para ver y cambiar su posición.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[...result.chordShapes.entries()].map(([symbol, voicings]) => {
            const occurrences = result.occurrences.filter(
              (o) => o.occurrence.chord.normalized === symbol,
            );
            const first = occurrences[0];
            const roman = songKey ? romanNumeral(first.occurrence.chord, songKey) : null;
            return (
              <button
                key={symbol}
                onClick={() => onSelectOccurrence(first.occurrence.index)}
                className="flex flex-col items-center rounded-lg border border-stone-200 bg-white p-2 hover:border-teal-500 hover:bg-teal-50/40"
              >
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold">{symbol}</span>
                  {roman && <span className="text-[10px] text-stone-400">{roman}</span>}
                </div>
                <ChordDiagram frets={voicings[0].frets} barre={voicings[0].barre} size="sm" />
                <span className="font-mono text-[10px] text-stone-500">
                  {voicings[0].display}
                  {voicings.length > 1 && ` +${voicings.length - 1}`}
                </span>
                <span className="text-[10px] text-stone-400">×{occurrences.length} veces</span>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  // ── Estado con selección: acorde actual + alternativas ──
  const symbol = selected.occurrence.chord.normalized;
  const occurrencesOfSymbol = result.occurrences.filter(
    (o) => o.occurrence.chord.normalized === symbol,
  );
  const symbolHasLocks = occurrencesOfSymbol.some((o) => locks[o.occurrence.index]);
  const roman = songKey ? romanNumeral(selected.occurrence.chord, songKey) : null;
  const isDiatonic = songKey ? !songKey.nonDiatonic.includes(symbol) : true;
  const v = selected.voicing;

  return (
    <aside className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-bold">{symbol}</h2>
          {roman && (
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                isDiatonic ? "bg-stone-100 text-stone-600" : "bg-purple-100 text-purple-800"
              }`}
              title={isDiatonic ? "Acorde de la tonalidad" : "Fuera de la tonalidad (color prestado)"}
            >
              {roman}
              {!isDiatonic && " · prestado"}
            </span>
          )}
        </div>
        <button onClick={onClose} className="rounded px-2 py-0.5 text-sm text-stone-400 hover:bg-stone-100">
          ✕
        </button>
      </div>
      <p className="mb-3 text-xs text-stone-500">
        Aparece ×{occurrencesOfSymbol.length} en la canción · {selected.reason}
      </p>

      {/* Posición actual */}
      <div className="mb-3 flex items-center gap-3 rounded-lg border border-teal-600 bg-teal-50/40 p-3">
        <ChordDiagram frets={v.frets} barre={v.barre} size="lg" />
        <div className="min-w-0 flex-1 space-y-0.5 text-xs text-stone-600">
          <div className="font-mono text-sm font-semibold text-stone-800">{v.display}</div>
          <div>{v.noteNames.join(" ")}</div>
          <div>
            Bajo {v.bassNote} · {v.inversion}
          </div>
          {v.omitted.length > 0 && (
            <div className="font-medium text-orange-700">Omite {v.omitted.join(", ")}</div>
          )}
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={() => playChord(v.midiNotes)}
              className="rounded border border-teal-600 px-2 py-0.5 text-teal-800 hover:bg-teal-600 hover:text-white"
            >
              ▶ Rasgueo
            </button>
            <button
              onClick={() => playArpeggio(v.midiNotes)}
              className="rounded border border-stone-300 px-2 py-0.5 text-stone-600 hover:bg-stone-100"
            >
              ♪ Arpegio
            </button>
          </div>
          {symbolHasLocks && (
            <button
              onClick={() => onClearLocks(symbol)}
              className="pt-1 text-[11px] text-amber-700 underline-offset-2 hover:underline"
            >
              🔓 Volver a la elección automática
            </button>
          )}
        </div>
      </div>

      {/* Duración de este acorde + editar símbolo (discreto) */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-stone-500">Duración:</span>
          <button
            onClick={() => onSetBeats(selectedIndex, Math.max(0.5, (selectedBeats ?? 1) - 0.5))}
            className="h-6 w-6 rounded border border-stone-300 text-stone-600 hover:bg-stone-100"
          >
            −
          </button>
          <span className="w-14 text-center font-mono text-sm text-stone-800">
            {selectedBeats ?? 1} {(selectedBeats ?? 1) === 1 ? "tiempo" : "tiempos"}
          </span>
          <button
            onClick={() => onSetBeats(selectedIndex, Math.min(8, (selectedBeats ?? 1) + 0.5))}
            className="h-6 w-6 rounded border border-stone-300 text-stone-600 hover:bg-stone-100"
          >
            +
          </button>
        </div>
        <button
          onClick={() => setEditOpen((o) => !o)}
          className="text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
        >
          ✎ Cambiar acorde
        </button>
      </div>

      {editOpen && (
        <div className="mb-3 rounded-lg border border-stone-200 bg-stone-50/60 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              autoFocus
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                setEditError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && applyEdit(true)}
              className="w-24 rounded border border-stone-300 bg-white px-2 py-1 font-mono text-sm outline-none focus:border-teal-600"
            />
            <button
              onClick={() => applyEdit(true)}
              disabled={editValue.trim() === selectedSymbol || !editValue.trim()}
              className="rounded bg-teal-700 px-2 py-1 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-40"
            >
              Todos los {selected.occurrence.originalSymbol ?? selectedSymbol}
            </button>
            <button
              onClick={() => applyEdit(false)}
              disabled={editValue.trim() === selectedSymbol || !editValue.trim()}
              className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-40"
            >
              Solo aquí
            </button>
          </div>
          {editError && <p className="mt-1 text-xs text-rose-700">{editError}</p>}
          {selected.occurrence.originalSymbol && (
            <button
              onClick={() => onRevertEdit(selected.occurrence.index)}
              className="mt-1.5 text-xs text-amber-700 underline-offset-2 hover:underline"
            >
              ↩ Volver al original ({selected.occurrence.originalSymbol})
            </button>
          )}
        </div>
      )}

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        Otras posiciones válidas
      </h3>
      <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {selected.alternatives.map((alt) => (
          <MiniVoicing
            key={alt.display}
            voicing={alt}
            onUseEverywhere={() => onApply(selected.occurrence.index, alt.display, true)}
            onUseHere={() => onApply(selected.occurrence.index, alt.display, false)}
          />
        ))}
      </div>
    </aside>
  );
}
