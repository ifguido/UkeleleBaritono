/**
 * Persistencia local de canciones. Es el equivalente del localStorage de la
 * web; la forma del registro es la misma para que una canción guardada
 * signifique lo mismo en las dos plataformas.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChordEdits, OptimizeMode } from "@core/engine";
import { VoicingOptions } from "@core/engine/voicings";

export interface SavedSong {
  id: string;
  name: string;
  text: string;
  mode: OptimizeMode;
  voicingOptions: VoicingOptions;
  locks: Record<number, string>;
  /** Acordes editados por el usuario (E → E7…). */
  edits?: ChordEdits;
  /** Tempo en BPM. */
  bpm?: number;
  /** Modo de ritmo: "layout" | "uniform". */
  rhythm?: string;
  /** Duraciones ajustadas a mano por ocurrencia. */
  beatsOverrides?: Record<number, number>;
  savedAt: string; // ISO
}

const KEY = "baritone-chords:songs";

export async function listSongs(): Promise<SavedSong[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSong[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSong(song: Omit<SavedSong, "id" | "savedAt"> & { id?: string }): Promise<SavedSong> {
  const songs = await listSongs();
  const id = song.id ?? `song-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const stored: SavedSong = { ...song, id, savedAt: new Date().toISOString() };
  const idx = songs.findIndex((s) => s.id === id);
  if (idx >= 0) songs[idx] = stored;
  else songs.unshift(stored);
  await AsyncStorage.setItem(KEY, JSON.stringify(songs));
  return stored;
}

export async function deleteSong(id: string): Promise<SavedSong[]> {
  const songs = (await listSongs()).filter((s) => s.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(songs));
  return songs;
}
