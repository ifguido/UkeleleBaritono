"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OptimizedOccurrence } from "@/lib/engine/optimizer";
import { ParsedSong } from "@/lib/engine/song-parser";
import { playChord, playProgression } from "@/lib/audio/synth";
import ChordDiagram from "./ChordDiagram";
import SongView from "./SongView";

interface Props {
  song: ParsedSong;
  optimized: Map<number, OptimizedOccurrence>;
  occurrences: OptimizedOccurrence[];
  initialBeatMs?: number;
  onClose: () => void;
}

const SPEEDS = [
  { label: "♩ Lenta", ms: 1400 },
  { label: "♩ Normal", ms: 950 },
  { label: "♩ Rápida", ms: 650 },
];

/**
 * Modo tocar: la letra a la izquierda (siguiendo el acorde actual) y a la
 * derecha el acorde en grande con el siguiente a la vista.
 */
export default function PracticeMode({
  song,
  optimized,
  occurrences,
  initialBeatMs = 950,
  onClose,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [beatMs, setBeatMs] = useState(initialBeatMs);
  const handleRef = useRef<{ cancel: () => void } | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lyricsRef = useRef<HTMLDivElement | null>(null);

  const stop = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
    if (endTimerRef.current) clearTimeout(endTimerRef.current);
    endTimerRef.current = null;
    setPlaying(false);
  }, []);

  const startFrom = useCallback(
    (from: number) => {
      stop();
      const slice = occurrences.slice(from);
      if (slice.length === 0) return;
      const handle = playProgression(
        slice.map((o) => o.voicing.midiNotes),
        beatMs,
        (i) => setCurrent(from + i),
      );
      handleRef.current = handle;
      endTimerRef.current = setTimeout(() => setPlaying(false), handle.totalMs);
      setPlaying(true);
    },
    [beatMs, occurrences, stop],
  );

  const step = useCallback(
    (delta: number) => {
      stop();
      setCurrent((c) => {
        const next = Math.min(occurrences.length - 1, Math.max(0, c + delta));
        const occ = occurrences[next];
        if (occ) playChord(occ.voicing.midiNotes);
        return next;
      });
    },
    [occurrences, stop],
  );

  // Teclado: ←/→ avanzar, espacio reproducir/parar, Esc cerrar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stop();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === " ") {
        e.preventDefault();
        if (playing) stop();
        else startFrom(current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, current, startFrom, step, stop, onClose]);

  useEffect(() => () => stop(), [stop]);

  const occ = occurrences[current];
  const currentGlobalIndex = occ?.occurrence.index ?? -1;

  // La letra sigue al acorde actual
  useEffect(() => {
    const container = lyricsRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-occ="${currentGlobalIndex}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentGlobalIndex]);

  if (!occ) return null;
  const next = occurrences[current + 1];
  const after = occurrences[current + 2];

  const jumpTo = (globalIndex: number) => {
    const idx = occurrences.findIndex((o) => o.occurrence.index === globalIndex);
    if (idx < 0) return;
    stop();
    setCurrent(idx);
    playChord(occurrences[idx].voicing.midiNotes);
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex flex-col bg-stone-50">
      {/* Barra superior */}
      <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-2.5">
        <span className="font-semibold max-sm:hidden">Modo tocar</span>
        {occ.occurrence.sectionName && (
          <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-teal-800">
            {occ.occurrence.sectionName}
          </span>
        )}
        <span className="text-sm text-stone-400">
          {current + 1} / {occurrences.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={beatMs}
            onChange={(e) => {
              setBeatMs(Number(e.target.value));
              if (playing) stop();
            }}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
          >
            {SPEEDS.map((s) => (
              <option key={s.ms} value={s.ms}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => (playing ? stop() : startFrom(current))}
            className="rounded-lg bg-teal-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            {playing ? "■ Parar" : "▶ Reproducir"}
          </button>
          <button
            onClick={() => {
              stop();
              onClose();
            }}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
          >
            ✕ Salir
          </button>
        </div>
      </div>

      {/* Letra + acordes a la derecha */}
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <div ref={lyricsRef} className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <SongView
            song={song}
            optimized={optimized}
            onChordClick={jumpTo}
            playingIndex={currentGlobalIndex}
          />
          <p className="mt-2 text-center text-xs text-stone-400">
            Tocá cualquier acorde de la letra para saltar ahí · ←/→ cambiar · espacio reproducir ·
            Esc salir
          </p>
        </div>

        <aside className="flex shrink-0 items-center justify-center gap-8 border-t border-stone-200 bg-white p-4 max-sm:py-3 sm:w-[320px] sm:flex-col sm:justify-start sm:gap-6 sm:overflow-y-auto sm:border-l sm:border-t-0 sm:p-6">
          {/* Acorde actual */}
          <div className="flex flex-col items-center">
            <span className="text-4xl font-bold tracking-tight sm:text-5xl">
              {occ.occurrence.chord.normalized}
            </span>
            <ChordDiagram frets={occ.voicing.frets} barre={occ.voicing.barre} size="xl" />
            <span className="font-mono text-base text-stone-600">{occ.voicing.display}</span>
            {occ.voicing.omitted.length > 0 && (
              <span className="text-xs font-medium text-orange-700">
                omite {occ.voicing.omitted.join(", ")}
              </span>
            )}
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => step(-1)}
                disabled={current === 0}
                className="rounded-lg border border-stone-300 px-3 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
              >
                ←
              </button>
              <button
                onClick={() => playChord(occ.voicing.midiNotes)}
                className="rounded-lg border border-teal-700 px-3 py-1 text-sm text-teal-800 hover:bg-teal-50"
              >
                ▶ Escuchar
              </button>
              <button
                onClick={() => step(1)}
                disabled={!next}
                className="rounded-lg border border-stone-300 px-3 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
              >
                →
              </button>
            </div>
          </div>

          {/* Lo que viene */}
          {next && (
            <button onClick={() => step(1)} className="flex flex-col items-center opacity-90 hover:opacity-100">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                siguiente
              </span>
              <span className="text-2xl font-semibold text-stone-700">
                {next.occurrence.chord.normalized}
              </span>
              <ChordDiagram frets={next.voicing.frets} barre={next.voicing.barre} size="lg" />
              <span className="font-mono text-xs text-stone-500">{next.voicing.display}</span>
            </button>
          )}
          {after && (
            <div className="hidden flex-col items-center opacity-50 sm:flex">
              <span className="text-[11px] uppercase tracking-wide text-stone-400">después</span>
              <span className="text-base font-semibold text-stone-600">
                {after.occurrence.chord.normalized}
              </span>
              <ChordDiagram frets={after.voicing.frets} barre={after.voicing.barre} size="sm" />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
