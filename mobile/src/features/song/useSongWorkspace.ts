/**
 * Estado y acciones del adaptador de canciones.
 *
 * Es la lógica de la página principal de la web, separada de la vista:
 * parsear, aplicar ediciones, optimizar, fijar posiciones, reproducir. La
 * pantalla solo dibuja lo que este hook le da.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  ChordEdits,
  DetectedKey,
  EMPTY_EDITS,
  OptimizeMode,
  OptimizeResult,
  OptimizedOccurrence,
  ParsedSong,
  RhythmMode,
  applyChordEdits,
  detectKey,
  estimateBeats,
  optimizeProgression,
  parseSong,
} from "@core/engine";
import { VoicingOptions } from "@core/engine/voicings";
import { PlaybackHandle, playChord, playProgression, preloadAudio } from "@/audio/synth";
import { successFeedback, tapFeedback } from "@/lib/haptics";
import { IMPORT_FALLBACK, importSongFromUrl, looksLikeUrl } from "./importSong";
import { SavedSong, deleteSong, listSongs, saveSong } from "./storage";

export interface Settings {
  mode: OptimizeMode;
  voicingOptions: VoicingOptions;
}

export interface OccurrenceRange {
  start: number;
  end: number;
}

export const DEMO = `[Intro]
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

const NO_CHORDS =
  "No encontré acordes en el texto. Pegá una canción con los acordes sobre la letra (o entre corchetes, como [Em]) o una progresión suelta como: E F#m C#m B7";

export function useSongWorkspace() {
  const [input, setInput] = useState("");
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
  const [workbench, setWorkbench] = useState<{ index: number; editing: boolean } | null>(null);
  const [bpm, setBpm] = useState(90);
  const [editorOpen, setEditorOpen] = useState(true);
  const [rhythm, setRhythm] = useState<RhythmMode>("layout");
  const [beatsOverrides, setBeatsOverrides] = useState<Record<number, number>>({});
  const playingRef = useRef<PlaybackHandle | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Un "tiempo" (beats=1) dura 60000/bpm ms.
  const beatMs = Math.round(60000 / bpm);

  useEffect(() => {
    void listSongs().then(setSaved);
    preloadAudio();
  }, []);
  useEffect(() => () => playingRef.current?.cancel(), []);

  const runOptimize = useCallback(
    (text: string, s: Settings, currentLocks: Record<number, string>, currentEdits: ChordEdits) => {
      setError(null);
      const parsed = parseSong(text);
      if (parsed.occurrences.length === 0) {
        setError(NO_CHORDS);
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

  /**
   * Optimiza un texto dado: lo que hay en el editor, o lo que llega desde
   * "Compartir" de otra app (una URL de un sitio de acordes, o la canción
   * entera como texto).
   */
  const optimizeText = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setInput(raw);
    stopPlayback();
    setLocks({});
    setEdits(EMPTY_EDITS);
    setBeatsOverrides({});
    setSelectedOcc(null);
    setCurrentSongId(null);

    if (looksLikeUrl(text)) {
      setBusy(true);
      setError(null);
      try {
        const imported = await importSongFromUrl(text);
        setInput(imported);
        if (runOptimize(imported, settings, {}, EMPTY_EDITS)) setEditorOpen(false);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : IMPORT_FALLBACK);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (runOptimize(text, settings, {}, EMPTY_EDITS)) setEditorOpen(false);
  }, [settings, runOptimize, stopPlayback]);

  const handleOptimize = useCallback(() => optimizeText(input), [optimizeText, input]);

  const handleSettingsChange = useCallback(
    (s: Settings) => {
      setSettings(s);
      if (song) runOptimize(input, s, locks, edits);
    },
    [song, input, locks, edits, runOptimize],
  );

  const handleApply = useCallback(
    (occurrenceIndex: number, display: string, wholeSong: boolean) => {
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
    },
    [song, result, locks, input, settings, edits, runOptimize],
  );

  const handleClearLocks = useCallback(
    (symbol: string) => {
      if (!song) return;
      const next = { ...locks };
      for (const occ of song.occurrences) {
        if (occ.chord.normalized === symbol) delete next[occ.index];
      }
      setLocks(next);
      runOptimize(input, settings, next, edits);
    },
    [song, locks, input, settings, edits, runOptimize],
  );

  const handleEditChord = useCallback(
    (occurrenceIndex: number, newSymbol: string, wholeSong: boolean) => {
      if (!song) return;
      const occ = song.occurrences.find((o) => o.index === occurrenceIndex);
      if (!occ) return;
      const originalKey = occ.originalSymbol ?? occ.chord.normalized;
      const next: ChordEdits = { bySymbol: { ...edits.bySymbol }, byOccurrence: { ...edits.byOccurrence } };
      if (wholeSong) {
        next.bySymbol[originalKey] = newSymbol;
        // Un cambio global pisa los cambios puntuales previos del mismo acorde
        for (const o of song.occurrences) {
          if ((o.originalSymbol ?? o.chord.normalized) === originalKey) delete next.byOccurrence[o.index];
        }
      } else {
        next.byOccurrence[occurrenceIndex] = newSymbol;
      }
      setEdits(next);
      runOptimize(input, settings, locks, next);
    },
    [song, edits, input, settings, locks, runOptimize],
  );

  const handleRevertEdit = useCallback(
    (occurrenceIndex: number) => {
      if (!song) return;
      const occ = song.occurrences.find((o) => o.index === occurrenceIndex);
      if (!occ) return;
      const originalKey = occ.originalSymbol ?? occ.chord.normalized;
      const next: ChordEdits = { bySymbol: { ...edits.bySymbol }, byOccurrence: { ...edits.byOccurrence } };
      delete next.byOccurrence[occurrenceIndex];
      delete next.bySymbol[originalKey];
      setEdits(next);
      runOptimize(input, settings, locks, next);
    },
    [song, edits, input, settings, locks, runOptimize],
  );

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

  const handleSetBeats = useCallback((occurrenceIndex: number, beats: number) => {
    setBeatsOverrides((prev) => ({ ...prev, [occurrenceIndex]: beats }));
  }, []);

  const handlePlay = useCallback(() => {
    if (result) playOccurrences(result.occurrences);
  }, [result, playOccurrences]);

  const playRange = useCallback(
    (r: OccurrenceRange) => {
      if (!result) return;
      playOccurrences(result.occurrences.filter((o) => o.occurrence.index >= r.start && o.occurrence.index <= r.end));
    },
    [result, playOccurrences],
  );

  const optimizedMap = useMemo(() => {
    const map = new Map<number, OptimizedOccurrence>();
    if (result) for (const o of result.occurrences) map.set(o.occurrence.index, o);
    return map;
  }, [result]);

  const selectAndPlay = useCallback(
    (index: number) => {
      setSelectedOcc(index);
      tapFeedback();
      // Al elegir un acorde, sonar su voicing: se ve y se escucha.
      const occ = optimizedMap.get(index);
      if (occ) playChord(occ.voicing.midiNotes);
    },
    [optimizedMap],
  );

  const openWorkbench = useCallback(
    (index: number, editing: boolean) => {
      setSelectedOcc(index);
      const occ = optimizedMap.get(index);
      if (occ) playChord(occ.voicing.midiNotes);
      setWorkbench({ index, editing });
    },
    [optimizedMap],
  );

  const handleChordClick = useCallback(
    (index: number) => {
      if (!rangeMode) {
        selectAndPlay(index);
        return;
      }
      tapFeedback();
      // Primer toque: inicio. Segundo: fin. El siguiente arranca un rango nuevo.
      setRange((current) =>
        current && current.start === current.end && index !== current.start
          ? { start: Math.min(current.start, index), end: Math.max(current.start, index) }
          : { start: index, end: index },
      );
    },
    [rangeMode, selectAndPlay],
  );

  const toggleRangeMode = useCallback(() => {
    setRangeMode((m) => !m);
    setRange(null);
  }, []);

  const persist = useCallback(
    async (name: string) => {
      const stored = await saveSong({
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
      setSaved(await listSongs());
      successFeedback();
    },
    [currentSongId, input, settings, locks, edits, bpm, rhythm, beatsOverrides],
  );

  // Alert.prompt solo existe en iOS: el nombre se pide con una hoja propia.
  const [savePrompt, setSavePrompt] = useState<string | null>(null);
  const handleSave = useCallback(() => {
    if (!song) return;
    const currentName = saved.find((s) => s.id === currentSongId)?.name;
    setSavePrompt(currentName ?? song.title ?? "Mi canción");
  }, [song, saved, currentSongId]);
  const confirmSave = useCallback(
    (name: string) => {
      const suggested = savePrompt ?? "Mi canción";
      setSavePrompt(null);
      void persist(name.trim() || suggested);
    },
    [persist, savePrompt],
  );
  const cancelSave = useCallback(() => setSavePrompt(null), []);

  const handleLoad = useCallback(
    (s: SavedSong) => {
      stopPlayback();
      setInput(s.text);
      const loaded: Settings = { mode: s.mode, voicingOptions: s.voicingOptions };
      setSettings(loaded);
      setLocks(s.locks);
      setCurrentSongId(s.id);
      setEdits(s.edits ?? EMPTY_EDITS);
      setBpm(s.bpm ?? 90);
      setRhythm((s.rhythm as RhythmMode) ?? "layout");
      setBeatsOverrides(s.beatsOverrides ?? {});
      setSelectedOcc(null);
      if (runOptimize(s.text, loaded, s.locks, s.edits ?? EMPTY_EDITS)) setEditorOpen(false);
    },
    [runOptimize, stopPlayback],
  );

  const handleDelete = useCallback((s: SavedSong) => {
    Alert.alert("Eliminar canción", `¿Borrar "${s.name}"? No se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => void deleteSong(s.id).then(setSaved) },
    ]);
  }, []);

  const reset = useCallback(() => {
    stopPlayback();
    setSong(null);
    setResult(null);
    setSongKey(null);
    setLocks({});
    setEdits(EMPTY_EDITS);
    setBeatsOverrides({});
    setSelectedOcc(null);
    setCurrentSongId(null);
    setRange(null);
    setRangeMode(false);
    setEditorOpen(true);
    setError(null);
  }, [stopPlayback]);

  // Rango de ocurrencias de cada sección (para el ▶ del encabezado)
  const sectionRanges = useMemo(() => {
    const map = new Map<number, OccurrenceRange>();
    if (!song) return map;
    let header: number | null = null;
    let start: number | null = null;
    let end: number | null = null;
    const flush = () => {
      if (header !== null && start !== null && end !== null) map.set(header, { start, end });
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

  return {
    // estado
    input,
    setInput,
    song,
    result,
    songKey,
    settings,
    locks,
    selectedOcc,
    selected,
    playingIndex,
    busy,
    error,
    saved,
    currentSongId,
    rangeMode,
    range,
    workbench,
    bpm,
    setBpm,
    editorOpen,
    setEditorOpen,
    rhythm,
    setRhythm,
    beatsByOccurrence,
    optimizedMap,
    sectionRanges,
    difficultChords,
    // acciones
    handleOptimize,
    optimizeText,
    handleSettingsChange,
    handleApply,
    handleClearLocks,
    handleEditChord,
    handleRevertEdit,
    handleSetBeats,
    handlePlay,
    stopPlayback,
    playRange,
    selectAndPlay,
    openWorkbench,
    closeWorkbench: () => setWorkbench(null),
    handleChordClick,
    toggleRangeMode,
    clearRange: () => setRange(null),
    handleSave,
    savePrompt,
    confirmSave,
    cancelSave,
    handleLoad,
    handleDelete,
    reset,
    setSelectedOcc,
  };
}

export type SongWorkspace = ReturnType<typeof useSongWorkspace>;
