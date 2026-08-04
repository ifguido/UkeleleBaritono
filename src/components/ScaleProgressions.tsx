"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Scale } from "@/lib/engine/scales";
import { Progression, progressionsFor } from "@/lib/engine/scale-harmony";
import { playProgression } from "@/lib/audio/synth";
import ChordDiagram from "./ChordDiagram";
import { bestVoicing } from "./ScaleChords";

interface PlayState {
  progression: number;
  chord: number;
}

function ProgressionCard({
  progression,
  index,
  playing,
  bpm,
  onPlay,
  onStop,
}: {
  progression: Progression;
  index: number;
  playing: PlayState | null;
  bpm: number;
  onPlay: (index: number) => void;
  onStop: () => void;
}) {
  const isPlaying = playing?.progression === index;
  // Un blues son 12 compases: se lee en cuatro columnas, como en el papel.
  const columns = progression.chords.length === 12 ? 4 : Math.min(progression.chords.length, 4);

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h4 className="font-semibold">{progression.name}</h4>
        <span className="font-mono text-xs text-teal-700">
          {progression.chords.map((c) => c.roman).join(" · ")}
        </span>
        <button
          onClick={() => (isPlaying ? onStop() : onPlay(index))}
          className={`ml-auto rounded px-3 py-1 text-sm font-medium ${
            isPlaying
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "border border-teal-600 text-teal-800 hover:bg-teal-600 hover:text-white"
          }`}
        >
          {isPlaying ? "■ Parar" : "▶ Escuchar"}
        </button>
      </div>
      <p className="mt-1 text-sm text-stone-500">{progression.note}</p>

      <div
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {progression.chords.map((chord, i) => {
          const voicing = bestVoicing(chord.chord);
          const active = isPlaying && playing?.chord === i;
          return (
            <div
              key={`${chord.symbol}-${i}`}
              className={`flex flex-col items-center rounded-lg border p-2 transition-colors ${
                active ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-stone-200"
              }`}
            >
              <div className="flex w-full items-baseline justify-between">
                <span className="text-sm font-semibold">{chord.symbol}</span>
                <span className="font-mono text-[10px] text-stone-400">{chord.roman}</span>
              </div>
              {voicing ? (
                <ChordDiagram frets={voicing.frets} barre={voicing.barre} size="sm" />
              ) : (
                <span className="py-4 text-[10px] text-stone-400">sin posición</span>
              )}
              <span className="text-[10px] text-stone-400">
                {chord.bars} {chord.bars === 1 ? "compás" : "compases"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-stone-400">
        A {bpm} BPM, 4 tiempos por compás.
      </p>
    </div>
  );
}

export default function ScaleProgressions({ scale }: { scale: Scale }) {
  const progressions = useMemo(() => progressionsFor(scale), [scale]);
  const [playing, setPlaying] = useState<PlayState | null>(null);
  const [bpm, setBpm] = useState(92);
  const handleRef = useRef<{ cancel: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    handleRef.current?.cancel();
    handleRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(null);
  };

  useEffect(() => stop, []);
  // Al cambiar de escala, lo que estaba sonando ya no corresponde.
  useEffect(() => stop, [scale]);

  const play = (index: number) => {
    stop();
    const progression = progressions[index];
    const voicings = progression.chords.map((c) => bestVoicing(c.chord));
    const notes = voicings.map((v) => v?.midiNotes ?? []);
    if (notes.every((n) => n.length === 0)) return;
    const beats = progression.chords.map((c) => c.bars * 4);
    const handle = playProgression(
      notes,
      Math.round(60000 / bpm),
      (chord) => setPlaying({ progression: index, chord }),
      beats,
    );
    handleRef.current = handle;
    setPlaying({ progression: index, chord: 0 });
    timerRef.current = setTimeout(stop, handle.totalMs);
  };

  if (progressions.length === 0) {
    return (
      <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-500">
        No tengo progresiones típicas para esta escala. Mirá la pestaña de acordes: cualquier
        secuencia armada con esos acordes se puede puntear con {scale.name}.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-stone-500">
          Progresiones donde <strong>{scale.name}</strong> funciona de punta a punta. Poné una a
          sonar y punteá encima.
        </p>
        <label className="ml-auto flex items-center gap-2 text-sm text-stone-600">
          Tempo
          <input
            type="range"
            min={50}
            max={180}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-28 accent-teal-700"
          />
          <span className="w-14 font-mono text-xs">{bpm} BPM</span>
        </label>
      </div>

      {progressions.map((progression, i) => (
        <ProgressionCard
          key={progression.name}
          progression={progression}
          index={i}
          playing={playing}
          bpm={bpm}
          onPlay={play}
          onStop={stop}
        />
      ))}
    </div>
  );
}
