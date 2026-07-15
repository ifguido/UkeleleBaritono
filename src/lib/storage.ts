/**
 * Persistencia local de canciones (localStorage).
 */

import { ChordEdits, OptimizeMode } from "@/lib/engine";
import { VoicingOptions } from "@/lib/engine/voicings";

export interface SavedSong {
  id: string;
  name: string;
  text: string;
  mode: OptimizeMode;
  voicingOptions: VoicingOptions;
  locks: Record<number, string>;
  /** Acordes editados por el usuario (E → E7…). */
  edits?: ChordEdits;
  savedAt: string; // ISO
}

const KEY = "baritone-chords:songs";

export function listSongs(): SavedSong[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSong[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSong(song: Omit<SavedSong, "id" | "savedAt"> & { id?: string }): SavedSong {
  const songs = listSongs();
  const id = song.id ?? `song-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const stored: SavedSong = { ...song, id, savedAt: new Date().toISOString() };
  const idx = songs.findIndex((s) => s.id === id);
  if (idx >= 0) songs[idx] = stored;
  else songs.unshift(stored);
  window.localStorage.setItem(KEY, JSON.stringify(songs));
  return stored;
}

export function deleteSong(id: string): void {
  const songs = listSongs().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(songs));
}
