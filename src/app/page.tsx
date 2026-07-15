"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChordEdits,
  DetectedKey,
  EMPTY_EDITS,
  OptimizeResult,
  OptimizedOccurrence,
  ParsedSong,
  RhythmMode,
  applyChordEdits,
  detectKey,
  estimateBeats,
  optimizeProgression,
  parseSong,
} from "@/lib/engine";
import { playChord, playProgression, preloadAudio } from "@/lib/audio/synth";
import { SavedSong, deleteSong, listSongs, saveSong } from "@/lib/storage";
import AdvancedSettings, { Settings } from "@/components/AdvancedSettings";
import SongView, { OccurrenceRange } from "@/components/SongView";
import ChordPanel from "@/components/ChordPanel";
import ChordStrip from "@/components/ChordStrip";
import ChordDiagram from "@/components/ChordDiagram";
import { difficultyLabel } from "@/components/VoicingCard";

const DEMO = `[Intro]
E  F#m  C#m  F#dim  B7

[Verso]
E        F#m       C#m
Alguna letra de ejemplo
F#dim    B7        E
para probar el arreglo

[Puente]
C#m  G#m  B  C#m
G#m  B  Cdim  C#m
C  Am  G#m  F#m`;

export default function HomePage() {
  const [input, setInput] = useState("https://www.cifraclub.com/milo-j/nino/");
  const [song, setSong] = useState<ParsedSong | null>(null);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [songKey, setSongKey] = useState<DetectedKey | null>(null);
  const [settings, setSettings] = useState<Settings>({ mode: "auto", voicingOptions: {} });
  const [locks, setLocks] = useState<Record<number, string>>({});
  const [edits, setEdits] = useState<ChordEdits>(EMPTY_EDITS);
  const [selectedOcc, setSelectedOcc] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedSong[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [range, setRange] = useState<OccurrenceRange | null>(null);
  const [bpm, setBpm] = useState(90);
  const [editorOpen, setEditorOpen] = useState(true);
  const [rhythm, setRhythm] = useState<RhythmMode>("layout");
  const [beatsOverrides, setBeatsOverrides] = useState<Record<number, number>>({});
  const playingRef = useRef<{ cancel: () => void } | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Un "tiempo" (beats=1) dura 60000/bpm ms.
  const beatMs = Math.round(60000 / bpm);

  useEffect(() => {
    setSaved(listSongs());
    preloadAudio();
  }, []);
  useEffect(() => () => playingRef.current?.cancel(), []);

  const runOptimize = useCallback(
    (
      text: string,
      s: Settings,
      currentLocks: Record<number, string>,
      currentEdits: ChordEdits,
    ) => {
      setError(null);
      const parsed = parseSong(text);
      if (parsed.occurrences.length === 0) {
        setError(
          "No encontré acordes en el texto. Pegá una canción con los acordes sobre la letra (o entre corchetes, como [Em]) o una progresión suelta como: E F#m C#m B7",
        );
        setSong(null);
        setResult(null);
        return false;
      }
      const { song: edited, errors: editErrors } = applyChordEdits(parsed, currentEdits);
      if (editErrors.length > 0) {
        edited.errors = [...edited.errors, ...editErrors];
      }
      const optimized = optimizeProgression(edited.occurrences, {
        mode: s.mode,
        voicingOptions: s.voicingOptions,
        locks: currentLocks,
      });
      setSong(edited);
      setResult(optimized);
      setSongKey(detectKey(edited.occurrences.map((o) => o.chord)));
      return true;
    },
    [],
  );

  const stopPlayback = useCallback(() => {
    playingRef.current?.cancel();
    playingRef.current = null;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
    setPlayingIndex(null);
  }, []);

  const handleOptimize = async () => {
    const text = input.trim();
    if (!text) return;
    stopPlayback();
    setLocks({});
    setEdits(EMPTY_EDITS);
    setBeatsOverrides({});
    setSelectedOcc(null);
    setCurrentSongId(null);

    if (/^https?:\/\/\S+$/.test(text)) {
      setBusy(true);
      try {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: text }),
        });
        const data = await res.json();
        if (!res.ok || !data.text) {
          setError(
            data.error ??
              "No pude importar esa página automáticamente. Copiá el texto de la canción y pegalo acá: la entrada manual siempre funciona.",
          );
          return;
        }
        setInput(data.text);
        if (runOptimize(data.text, settings, {}, EMPTY_EDITS)) setEditorOpen(false);
      } catch {
        setError(
          "No pude importar esa página automáticamente. Copiá el texto de la canción y pegalo acá: la entrada manual siempre funciona.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    if (runOptimize(text, settings, {}, EMPTY_EDITS)) setEditorOpen(false);
  };

  const handleSettingsChange = (s: Settings) => {
    setSettings(s);
    if (song) runOptimize(input, s, locks, edits);
  };

  const handleApply = (occurrenceIndex: number, display: string, wholeSong: boolean) => {
    if (!song || !result) return;
    const next = { ...locks };
    if (wholeSong) {
      const symbol = song.occurrences[occurrenceIndex].chord.normalized;
      for (const occ of song.occurrences) {
        if (occ.chord.normalized === symbol) next[occ.index] = display;
      }
    } else {
      next[occurrenceIndex] = display;
    }
    setLocks(next);
    runOptimize(input, settings, next, edits);
    // La selección se mantiene: el panel muestra el cambio al instante.
  };

  const handleClearLocks = (symbol: string) => {
    if (!song) return;
    const next = { ...locks };
    for (const occ of song.occurrences) {
      if (occ.chord.normalized === symbol) delete next[occ.index];
    }
    setLocks(next);
    runOptimize(input, settings, next, edits);
  };

  const handleEditChord = (occurrenceIndex: number, newSymbol: string, wholeSong: boolean) => {
    if (!song) return;
    const occ = song.occurrences.find((o) => o.index === occurrenceIndex);
    if (!occ) return;
    const originalKey = occ.originalSymbol ?? occ.chord.normalized;
    const next: ChordEdits = {
      bySymbol: { ...edits.bySymbol },
      byOccurrence: { ...edits.byOccurrence },
    };
    if (wholeSong) {
      next.bySymbol[originalKey] = newSymbol;
      // Un cambio global pisa los cambios puntuales previos del mismo acorde
      for (const o of song.occurrences) {
        if ((o.originalSymbol ?? o.chord.normalized) === originalKey) {
          delete next.byOccurrence[o.index];
        }
      }
    } else {
      next.byOccurrence[occurrenceIndex] = newSymbol;
    }
    setEdits(next);
    runOptimize(input, settings, locks, next);
  };

  const handleRevertEdit = (occurrenceIndex: number) => {
    if (!song) return;
    const occ = song.occurrences.find((o) => o.index === occurrenceIndex);
    if (!occ) return;
    const originalKey = occ.originalSymbol ?? occ.chord.normalized;
    const next: ChordEdits = {
      bySymbol: { ...edits.bySymbol },
      byOccurrence: { ...edits.byOccurrence },
    };
    delete next.byOccurrence[occurrenceIndex];
    delete next.bySymbol[originalKey];
    setEdits(next);
    runOptimize(input, settings, locks, next);
  };

  // Duración relativa de cada acorde (por índice global de ocurrencia)
  const beatsByOccurrence = useMemo(
    () => (song ? estimateBeats(song, rhythm, beatsOverrides) : []),
    [song, rhythm, beatsOverrides],
  );

  const playOccurrences = useCallback(
    (occurrences: OptimizedOccurrence[]) => {
      if (occurrences.length === 0) return;
      stopPlayback();
      const handle = playProgression(
        occurrences.map((o) => o.voicing.midiNotes),
        beatMs,
        (i) => setPlayingIndex(occurrences[i]?.occurrence.index ?? null),
        occurrences.map((o) => beatsByOccurrence[o.occurrence.index] ?? 1),
      );
      playingRef.current = handle;
      resetTimerRef.current = setTimeout(() => {
        setPlayingIndex(null);
        playingRef.current = null;
      }, handle.totalMs);
    },
    [beatMs, stopPlayback, beatsByOccurrence],
  );

  const handleSetBeats = (occurrenceIndex: number, beats: number) => {
    setBeatsOverrides((prev) => ({ ...prev, [occurrenceIndex]: beats }));
  };

  const handlePlay = () => {
    if (result) playOccurrences(result.occurrences);
  };

  const playRange = (r: OccurrenceRange) => {
    if (!result) return;
    playOccurrences(
      result.occurrences.filter(
        (o) => o.occurrence.index >= r.start && o.occurrence.index <= r.end,
      ),
    );
  };

  const selectAndPlay = (index: number) => {
    setSelectedOcc(index);
    // Al elegir un acorde, sonar su voicing: se ve y se escucha en el panel.
    const occ = result?.occurrences.find((o) => o.occurrence.index === index);
    if (occ) playChord(occ.voicing.midiNotes);
  };

  const handleChordClick = (index: number) => {
    if (!rangeMode) {
      selectAndPlay(index);
      return;
    }
    // Primer clic: inicio. Segundo: fin. El siguiente arranca un rango nuevo.
    if (range && range.start === range.end && index !== range.start) {
      setRange({ start: Math.min(range.start, index), end: Math.max(range.start, index) });
    } else {
      setRange({ start: index, end: index });
    }
  };

  const toggleRangeMode = () => {
    setRangeMode((m) => !m);
    setRange(null);
  };

  const handleSave = () => {
    if (!song) return;
    const currentName = saved.find((s) => s.id === currentSongId)?.name;
    const name = window.prompt(
      "Nombre para guardar la canción:",
      currentName ?? song.title ?? "Mi canción",
    );
    if (!name) return;
    const stored = saveSong({
      id: currentSongId ?? undefined,
      name,
      text: input,
      mode: settings.mode,
      voicingOptions: settings.voicingOptions,
      locks,
      edits,
      bpm,
      rhythm,
      beatsOverrides,
    });
    setCurrentSongId(stored.id);
    setSaved(listSongs());
  };

  const handleLoad = (s: SavedSong) => {
    setInput(s.text);
    const loaded: Settings = { mode: s.mode, voicingOptions: s.voicingOptions };
    setSettings(loaded);
    setLocks(s.locks);
    setCurrentSongId(s.id);
    setEdits(s.edits ?? EMPTY_EDITS);
    setBpm(s.bpm ?? 90);
    setRhythm((s.rhythm as RhythmMode) ?? "layout");
    setBeatsOverrides(s.beatsOverrides ?? {});
    if (runOptimize(s.text, loaded, s.locks, s.edits ?? EMPTY_EDITS)) setEditorOpen(false);
  };

  const optimizedMap = useMemo(() => {
    const map = new Map<number, OptimizedOccurrence>();
    if (result) for (const o of result.occurrences) map.set(o.occurrence.index, o);
    return map;
  }, [result]);

  // Rango de ocurrencias de cada sección (para el ▶ del encabezado)
  const sectionRanges = useMemo(() => {
    const map = new Map<number, OccurrenceRange>();
    if (!song) return map;
    let header: number | null = null;
    let start: number | null = null;
    let end: number | null = null;
    const flush = () => {
      if (header !== null && start !== null && end !== null) {
        map.set(header, { start, end });
      }
    };
    song.lines.forEach((line, i) => {
      if (line.type === "section") {
        flush();
        header = i;
        start = end = null;
      } else if (line.type === "chords") {
        for (const t of line.tokens) {
          if (t.occurrenceIndex === undefined) continue;
          if (start === null) start = t.occurrenceIndex;
          end = t.occurrenceIndex;
        }
      }
    });
    flush();
    return map;
  }, [song]);

  const difficultChords = useMemo(() => {
    if (!result) return [];
    const seen = new Set<string>();
    return result.occurrences.filter((o) => {
      const key = `${o.occurrence.chord.normalized}:${o.voicing.display}`;
      if (seen.has(key) || o.voicing.difficulty <= 3.2) return false;
      seen.add(key);
      return true;
    });
  }, [result]);

  const selected = selectedOcc !== null ? (optimizedMap.get(selectedOcc) ?? null) : null;

  return (
    <div className="space-y-6">
      {/* Entrada */}
      <section className="no-print">
        {!result && (
          <div className="mb-6 mt-4 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Tu canción, lista para ukelele barítono
            </h1>
            <p className="mt-2 text-stone-500">
              Pegá una canción con acordes (o una URL) y te devuelvo posiciones correctas, cómodas y
              verificadas nota por nota.
            </p>
          </div>
        )}

        {result && !editorOpen ? (
          // Editor colapsado: la canción ya se ve abajo, no hace falta el textarea.
          <button
            onClick={() => setEditorOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-500 hover:border-teal-500 hover:text-stone-800"
          >
            <span>✎ Editar el texto de la canción o cambiar la URL</span>
          </button>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={result ? 8 : 10}
              placeholder={`Pegá acá tu canción o una URL…\n\nE        F#m       C#m\nAlguna letra por aquí\n\nTambién sirve una progresión suelta: E F#m C#m B7`}
              className="w-full resize-y rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-sm outline-none focus:border-teal-600"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={handleOptimize}
                disabled={busy || !input.trim()}
                className="rounded-lg bg-teal-700 px-5 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-40"
              >
                {busy ? "Importando…" : result ? "Aplicar cambios" : "Optimizar"}
              </button>
              {result && (
                <button
                  onClick={() => setEditorOpen(false)}
                  className="text-sm text-stone-500 underline-offset-2 hover:underline"
                >
                  Cancelar
                </button>
              )}
              {!result && (
                <>
                  <button
                    onClick={() => setInput(DEMO)}
                    className="text-sm text-stone-500 underline-offset-2 hover:underline"
                  >
                    Probar con un ejemplo
                  </button>
                  <span className="ml-auto text-sm text-stone-400">
                    ¿Solo querés ver un acorde?{" "}
                    <Link href="/explorador" className="text-teal-700 hover:underline">
                      Explorá sus posiciones →
                    </Link>
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        )}
      </section>

      {/* Canciones guardadas */}
      {!result && saved.length > 0 && (
        <section className="no-print">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Canciones guardadas
          </h2>
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <button onClick={() => handleLoad(s)} className="font-medium text-teal-800 hover:underline">
                  {s.name}
                </button>
                <span className="text-xs text-stone-400">
                  {new Date(s.savedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => {
                    deleteSong(s.id);
                    setSaved(listSongs());
                  }}
                  className="ml-auto text-xs text-stone-400 hover:text-rose-600"
                >
                  eliminar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Resultado */}
      {result && song && (
        <>
          <section className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {song.title ?? "Arreglo para barítono"}
                {song.artist && <span className="font-normal text-stone-500"> — {song.artist}</span>}
              </h1>
              {songKey && (
                <p className="text-sm text-stone-500">
                  Tonalidad detectada: <strong className="text-stone-700">{songKey.name}</strong>
                  {songKey.nonDiatonic.length > 0 && (
                    <span> · fuera de la tonalidad: {songKey.nonDiatonic.join(", ")}</span>
                  )}
                </p>
              )}
            </div>
            <div className="no-print ml-auto flex flex-wrap items-center gap-2">
              <label
                title="Tempo de la canción entera, en pulsos por minuto"
                className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-700"
              >
                <span className="text-stone-500">Tempo</span>
                <input
                  type="range"
                  min={40}
                  max={180}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-20 accent-teal-700"
                />
                <span className="w-14 font-mono text-xs tabular-nums">{bpm} BPM</span>
              </label>
              <select
                value={rhythm}
                onChange={(e) => setRhythm(e.target.value as RhythmMode)}
                title="Duración de cada acorde: pareja, o estimada según cuánta letra abarca (y anotaciones E*2)"
                className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-700"
              >
                <option value="layout">Ritmo: según letra</option>
                <option value="uniform">Ritmo: uniforme</option>
              </select>
              <button
                onClick={playingIndex === null ? handlePlay : stopPlayback}
                className="rounded-lg border border-teal-700 px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
              >
                {playingIndex === null ? "▶ Escuchar todo" : "■ Detener"}
              </button>
              <button
                onClick={toggleRangeMode}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  rangeMode
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-teal-700 text-teal-800 hover:bg-teal-50"
                }`}
              >
                {rangeMode ? "✕ Salir de selección" : "⧉ Escuchar una parte"}
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
              >
                Guardar
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
              >
                Exportar PDF
              </button>
            </div>
          </section>

          {song.errors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <strong>Acordes que no entendí</strong> (quedaron marcados en la canción):
              <ul className="ml-4 list-disc">
                {song.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {result.unplayable.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {result.unplayable.map((u, i) => (
                <p key={i}>{u.message}</p>
              ))}
            </div>
          )}

          {/* Resumen de acordes: solo para la exportación en PDF */}
          <section className="hidden print:block">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
              Acordes de la canción
            </h2>
            <div className="flex flex-wrap gap-3">
              {[...result.chordShapes.entries()].map(([symbol, voicings]) =>
                voicings.map((v) => (
                  <div
                    key={symbol + v.display}
                    className="flex flex-col items-center rounded-lg border border-stone-200 bg-white px-3 pb-1 pt-2"
                  >
                    <span className="text-sm font-semibold">{symbol}</span>
                    <ChordDiagram frets={v.frets} barre={v.barre} size="sm" />
                    <span className="font-mono text-[11px] text-stone-500">{v.display}</span>
                    {v.omitted.length > 0 && (
                      <span className="text-[10px] font-medium text-orange-700">
                        omite {v.omitted.join(", ")}
                      </span>
                    )}
                  </div>
                )),
              )}
            </div>
          </section>

          {/* Mesa de trabajo: canción + panel de acordes en la misma pantalla */}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
          {/* Mobile: tira de acordes fija arriba, en orden de la canción */}
          <ChordStrip
            result={result}
            songKey={songKey}
            selectedSymbol={selected?.occurrence.chord.normalized ?? null}
            onSelect={selectAndPlay}
          />
          {rangeMode && (
            <div className="no-print sticky top-2 z-40 flex flex-wrap items-center gap-3 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2.5 text-sm text-teal-900 shadow-sm">
              {range === null && <span>Tocá el <strong>primer acorde</strong> de la parte que querés escuchar.</span>}
              {range !== null && range.start === range.end && (
                <span>Ahora tocá el <strong>último acorde</strong> de la parte (o reproducí solo ese).</span>
              )}
              {range !== null && range.start !== range.end && (
                <span>
                  Parte seleccionada: <strong>{range.end - range.start + 1} acordes</strong>.
                </span>
              )}
              {range !== null && (
                <>
                  <button
                    onClick={() => playRange(range)}
                    className="rounded bg-teal-700 px-3 py-1 font-medium text-white hover:bg-teal-800"
                  >
                    ▶ Reproducir
                  </button>
                  {playingIndex !== null && (
                    <button
                      onClick={stopPlayback}
                      className="rounded border border-teal-700 px-3 py-1 font-medium text-teal-800 hover:bg-white"
                    >
                      ■ Detener
                    </button>
                  )}
                  <button onClick={() => setRange(null)} className="text-teal-700 underline-offset-2 hover:underline">
                    limpiar
                  </button>
                </>
              )}
            </div>
          )}

          <SongView
            song={song}
            optimized={optimizedMap}
            onChordClick={handleChordClick}
            playingIndex={playingIndex}
            rangeMode={rangeMode}
            range={range}
            selectedIndex={selectedOcc}
            selectedSymbol={selected?.occurrence.chord.normalized ?? null}
            sectionRanges={sectionRanges}
            onPlaySection={playRange}
          />

          {difficultChords.length > 0 && (
            <section className="no-print">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                Acordes que pueden costar más
              </h2>
              <div className="space-y-1 rounded-lg border border-stone-200 bg-white p-3 text-sm">
                {difficultChords.map((o) => {
                  const d = difficultyLabel(o.voicing.difficulty);
                  return (
                    <p key={o.occurrence.index} className="text-stone-700">
                      <button
                        className="font-semibold text-teal-800 hover:underline"
                        onClick={() => setSelectedOcc(o.occurrence.index)}
                      >
                        {o.occurrence.chord.normalized}
                      </button>{" "}
                      ({o.voicing.display}) — dificultad{" "}
                      <span className={`rounded px-1 ${d.className}`}>{d.text}</span> ·{" "}
                      {o.alternatives.length} alternativas disponibles
                    </p>
                  );
                })}
              </div>
            </section>
          )}

          <AdvancedSettings settings={settings} onChange={handleSettingsChange} />
          </div>

          <div
            className={`no-print lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain ${
              selected
                ? "max-lg:fixed max-lg:inset-x-2 max-lg:bottom-2 max-lg:z-50 max-lg:max-h-[70vh] max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:rounded-xl max-lg:shadow-2xl"
                : "max-lg:hidden"
            }`}
          >
            <ChordPanel
              song={song}
              result={result}
              songKey={songKey}
              selected={selected}
              locks={locks}
              onSelectOccurrence={selectAndPlay}
              onApply={handleApply}
              onClearLocks={handleClearLocks}
              onEditChord={handleEditChord}
              onRevertEdit={handleRevertEdit}
              selectedBeats={selectedOcc !== null ? beatsByOccurrence[selectedOcc] : undefined}
              onSetBeats={handleSetBeats}
              onClose={() => setSelectedOcc(null)}
            />
          </div>
          </div>
        </>
      )}
    </div>
  );
}
