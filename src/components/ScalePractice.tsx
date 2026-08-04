"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Scale } from "@/lib/engine/scales";
import { PositionNote, ScalePosition } from "@/lib/engine/scale-fretboard";
import {
  Lick,
  PATTERNS,
  Pattern,
  applyPattern,
  availableLicks,
  renderLick,
} from "@/lib/engine/scale-patterns";
import { playMelody } from "@/lib/audio/synth";
import ScaleBoxDiagram from "./ScaleBoxDiagram";
import TabStaff from "./TabStaff";
import { fretKey } from "./FretboardDiagram";

interface Props {
  scale: Scale;
  position: ScalePosition;
  /** Para que el mástil de arriba también marque la nota que suena. */
  onActiveNote?: (key: string | null) => void;
}

type Mode = "secuencias" | "frases";

export default function ScalePractice({ scale, position, onActiveNote }: Props) {
  const [mode, setMode] = useState<Mode>("secuencias");
  const [patternId, setPatternId] = useState<string>("up");
  const [lickId, setLickId] = useState<string | null>(null);
  const [bpm, setBpm] = useState(80);
  const [loop, setLoop] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const handleRef = useRef<{ cancel: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const licks = useMemo(() => availableLicks(scale), [scale]);

  // Al cambiar de escala puede desaparecer la frase elegida (una frase con
  // blue note no existe en una pentatónica): se cae a la primera disponible.
  const effectiveMode: Mode = mode === "frases" && licks.length === 0 ? "secuencias" : mode;
  const pattern: Pattern = PATTERNS.find((p) => p.id === patternId) ?? PATTERNS[0];
  const lick: Lick | null = licks.find((l) => l.id === lickId) ?? licks[0] ?? null;

  const sequence = useMemo(() => {
    if (effectiveMode === "frases" && lick) {
      return { notes: renderLick(scale, lick, position), grouping: 2 };
    }
    return applyPattern(position, pattern);
  }, [effectiveMode, lick, scale, position, pattern]);

  const stop = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setActiveIndex(null);
    setIsPlaying(false);
    onActiveNote?.(null);
  }, [onActiveNote]);

  // Cambiar de escala, de caja o de secuencia invalida lo que esté sonando:
  // la limpieza del efecto corta el audio antes de que entre lo nuevo.
  useEffect(() => stop, [scale, position, patternId, lickId, effectiveMode, stop]);

  const notes: PositionNote[] = sequence.notes;
  const noteMs = Math.max(60, Math.round(60000 / bpm / sequence.grouping));

  const play = useCallback(() => {
    stop();
    if (notes.length === 0) return;
    setIsPlaying(true);
    const run = () => {
      const handle = playMelody(
        notes.map((n) => n.midi),
        noteMs,
        (i) => {
          setActiveIndex(i);
          onActiveNote?.(fretKey(notes[i]));
        },
      );
      handleRef.current = handle;
      timerRef.current = setTimeout(() => {
        if (loop) run();
        else stop();
      }, handle.totalMs);
    };
    run();
  }, [notes, noteMs, loop, stop, onActiveNote]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-stone-300 bg-white p-0.5 text-sm">
          {(["secuencias", "frases"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={m === "frases" && licks.length === 0}
              className={`rounded px-3 py-1 capitalize ${
                effectiveMode === m ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-100"
              } disabled:opacity-40`}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="text-sm text-stone-500">
          {effectiveMode === "secuencias"
            ? "Ejercicios mecánicos sobre la caja elegida."
            : "Frases hechas: música, no ejercicios."}
        </span>
      </div>

      {/* Selector */}
      <div className="flex flex-wrap gap-1.5">
        {effectiveMode === "secuencias"
          ? PATTERNS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPatternId(p.id)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  patternId === p.id
                    ? "border-teal-600 bg-teal-50 font-medium text-teal-800"
                    : "border-stone-300 text-stone-600 hover:bg-stone-100"
                }`}
              >
                {p.name}
              </button>
            ))
          : licks.map((l) => (
              <button
                key={l.id}
                onClick={() => setLickId(l.id)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  lick?.id === l.id
                    ? "border-teal-600 bg-teal-50 font-medium text-teal-800"
                    : "border-stone-300 text-stone-600 hover:bg-stone-100"
                }`}
              >
                {l.name}
              </button>
            ))}
      </div>

      <p className="text-sm text-stone-600">
        {effectiveMode === "secuencias" ? pattern.note : (lick?.note ?? "")}
      </p>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => (isPlaying ? stop() : play())}
          className={`rounded px-4 py-2 text-sm font-medium ${
            isPlaying
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-teal-700 text-white hover:bg-teal-800"
          }`}
        >
          {isPlaying ? "■ Parar" : "▶ Tocar"}
        </button>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => setLoop(e.target.checked)}
            className="accent-teal-700"
          />
          Repetir
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          Tempo
          <input
            type="range"
            min={40}
            max={180}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-28 accent-teal-700"
          />
          <span className="w-14 font-mono text-xs">{bpm} BPM</span>
        </label>
        <span className="text-xs text-stone-400">
          {notes.length} notas ·{" "}
          {sequence.grouping === 3
            ? "tresillos"
            : sequence.grouping === 4
              ? "semicorcheas"
              : "corcheas"}
        </span>
      </div>

      {/* Tablatura + caja */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-stone-200 bg-white p-3">
          {notes.length > 0 ? (
            <TabStaff
              notes={notes}
              activeIndex={activeIndex}
              grouping={sequence.grouping}
              footer="degree"
            />
          ) : (
            <p className="text-sm text-stone-400">
              Esta secuencia no entra en la caja elegida. Probá con otra caja.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-3">
          <ScaleBoxDiagram
            position={position}
            labelMode="degree"
            active={activeIndex !== null && notes[activeIndex] ? fretKey(notes[activeIndex]) : null}
            size="sm"
          />
          <p className="mt-1 text-center text-[11px] text-stone-400">{position.label}</p>
        </div>
      </div>
    </div>
  );
}
