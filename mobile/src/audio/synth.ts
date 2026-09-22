/**
 * Audio de ukelele barítono en el teléfono.
 *
 * Es el mismo diseño que la web, sobre react-native-audio-api (una
 * implementación nativa de la Web Audio API):
 *
 * Primera opción: SAMPLES REALES de cuerda de nylon (soundfont FluidR3,
 * licencia MIT), empaquetados con la app. Cada nota se toca desde la muestra
 * más cercana (hay una cada tercera menor) pitcheada como máximo ±1,5
 * semitonos: timbre de instrumento de verdad, no de oscilador.
 *
 * Fallback: síntesis Karplus–Strong con cuerpo simulado, por si la
 * decodificación falla o todavía no terminó.
 */

import type { AudioBuffer, AudioBufferSourceNode, AudioContext, GainNode } from "react-native-audio-api";
import { Midi } from "@core/engine/notes";
import { readyContext, sharedAudioContext } from "./context";
import { SAMPLE_FILES } from "./samples";

let ksInput: GainNode | null = null; // entrada del fallback sintético (con EQ de caja)
let sampleInput: GainNode | null = null; // entrada de samples (ya traen cuerpo)
let chainBuilt = false;
const ksCache = new Map<Midi, AudioBuffer>();

let sampleBuffers: Map<Midi, AudioBuffer> | null = null;
let sampleLoadPromise: Promise<void> | null = null;

function loadSamples(ac: AudioContext): Promise<void> {
  if (sampleLoadPromise) return sampleLoadPromise;
  sampleLoadPromise = (async () => {
    try {
      const entries = await Promise.all(
        SAMPLE_FILES.map(async ([midi, asset]) => {
          const buffer = await ac.decodeAudioData(asset);
          return [midi, buffer] as const;
        }),
      );
      sampleBuffers = new Map(entries);
    } catch {
      // Archivo corrupto o decodificador sin soporte: seguimos con síntesis.
      sampleBuffers = null;
    }
  })();
  return sampleLoadPromise;
}

/**
 * Ejecuta `run` cuando los samples estén decodificados, para que NUNCA suene
 * el fallback sintético en el primer play. Si la carga falla o tarda demasiado,
 * corre igual (con síntesis) para no dejar la reproducción colgada.
 */
function whenSamplesReady(run: () => void): void {
  if (sampleBuffers || !sampleLoadPromise) {
    run();
    return;
  }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    run();
  };
  void sampleLoadPromise.then(go);
  setTimeout(go, 3000);
}

function nearestSample(midi: Midi): { buffer: AudioBuffer; rate: number } | null {
  if (!sampleBuffers) return null;
  let best: Midi | null = null;
  for (const [sampleMidi] of SAMPLE_FILES) {
    if (!sampleBuffers.has(sampleMidi)) continue;
    if (best === null || Math.abs(sampleMidi - midi) < Math.abs(best - midi)) {
      best = sampleMidi;
    }
  }
  if (best === null) return null;
  return { buffer: sampleBuffers.get(best)!, rate: Math.pow(2, (midi - best) / 12) };
}

function midiToFreq(midi: Midi): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Impulso corto de "aire" para dar sensación de instrumento en una sala. */
function airImpulse(ac: AudioContext): AudioBuffer {
  const sampleRate = ac.sampleRate;
  const length = Math.floor(sampleRate * 0.35);
  const buffer = ac.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.08)) * 0.5;
    }
    buffer.copyToChannel(data, ch);
  }
  return buffer;
}

/**
 * Arma el ruteo de salida: samples limpios, KS con caja, aire y un limitador
 * suave. No hay compresor nativo, así que el master queda por debajo de la
 * unidad y cuatro cuerdas a la vez no llegan a saturar.
 */
function buildChain(ac: AudioContext): void {
  if (chainBuilt) return;
  chainBuilt = true;

  const master = ac.createGain();
  master.gain.value = 0.85;
  master.connect(ac.destination);

  const convolver = ac.createConvolver();
  convolver.buffer = airImpulse(ac);
  const wet = ac.createGain();
  wet.gain.value = 0.12;
  convolver.connect(wet);
  wet.connect(master);

  // Los samples ya suenan a instrumento: solo limpieza de subgraves
  sampleInput = ac.createGain();
  const sampleHp = ac.createBiquadFilter();
  sampleHp.type = "highpass";
  sampleHp.frequency.value = 60;
  sampleInput.connect(sampleHp);
  sampleHp.connect(master);
  sampleHp.connect(convolver);

  // El fallback sintético necesita el cuerpo simulado
  ksInput = ac.createGain();
  const highpass = ac.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 70;
  const bodyLow = ac.createBiquadFilter();
  bodyLow.type = "peaking";
  bodyLow.frequency.value = 150;
  bodyLow.Q.value = 1.1;
  bodyLow.gain.value = 4;
  const bodyMid = ac.createBiquadFilter();
  bodyMid.type = "peaking";
  bodyMid.frequency.value = 320;
  bodyMid.Q.value = 1.3;
  bodyMid.gain.value = 2;
  const shelf = ac.createBiquadFilter();
  shelf.type = "highshelf";
  shelf.frequency.value = 3200;
  shelf.gain.value = -10;
  ksInput.connect(highpass);
  highpass.connect(bodyLow);
  bodyLow.connect(bodyMid);
  bodyMid.connect(shelf);
  shelf.connect(master);
  shelf.connect(convolver);
}

function audioContext(): AudioContext {
  const ac = sharedAudioContext();
  buildChain(ac);
  void loadSamples(ac);
  return ac;
}

/** Fallback: sintetiza (y cachea) la pulsación de una nota con Karplus–Strong. */
function ksBuffer(ac: AudioContext, midi: Midi): AudioBuffer {
  const cached = ksCache.get(midi);
  if (cached) return cached;

  const sampleRate = ac.sampleRate;
  const duration = 2.6;
  const length = Math.floor(sampleRate * duration);
  const out = new Float32Array(length);

  const freq = midiToFreq(midi);
  const period = Math.max(2, Math.round(sampleRate / freq));

  const smooth = new Float32Array(period);
  let previous = 0;
  for (let i = 0; i < period; i++) {
    const noise = Math.random() * 2 - 1;
    previous = 0.78 * previous + 0.22 * noise;
    smooth[i] = previous;
  }
  previous = smooth[period - 1];
  for (let i = 0; i < period; i++) {
    previous = 0.6 * previous + 0.4 * smooth[i];
    smooth[i] = previous;
  }
  const pick = Math.max(1, Math.round(period * 0.2));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) {
    ring[i] = smooth[i] - 0.65 * smooth[(i - pick + period) % period];
  }

  const decay = 0.996;
  for (let i = 0; i < length; i++) {
    const j = i % period;
    const next = (j + 1) % period;
    out[i] = ring[j];
    ring[j] = decay * 0.5 * (ring[j] + ring[next]);
  }

  const cutoff = Math.min(Math.max(freq * 4, 900), 2600);
  const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
  for (let pass = 0; pass < 2; pass++) {
    let y = 0;
    for (let i = 0; i < length; i++) {
      y += alpha * (out[i] - y);
      out[i] = y;
    }
  }

  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) {
    const scale = 0.9 / peak;
    for (let i = 0; i < length; i++) out[i] *= scale;
  }
  const attack = Math.floor(sampleRate * 0.002);
  for (let i = 0; i < attack; i++) out[i] *= i / attack;
  const fade = Math.floor(sampleRate * 0.08);
  for (let i = 0; i < fade; i++) out[length - 1 - i] *= i / fade;

  const buffer = ac.createBuffer(1, length, sampleRate);
  buffer.copyToChannel(out, 0);
  ksCache.set(midi, buffer);
  return buffer;
}

interface Scheduled {
  sources: AudioBufferSourceNode[];
  bus: GainNode;
}

function scheduleNote(ac: AudioContext, target: Scheduled, midi: Midi, when: number, level = 0.5): void {
  const sample = nearestSample(midi);
  const source = ac.createBufferSource({ pitchCorrection: false });
  // Micro-desafinación: cuerdas reales nunca están perfectas (±3 cents)
  const cents = (Math.random() - 0.5) * 6;
  if (sample) {
    source.buffer = sample.buffer;
    source.playbackRate.value = sample.rate * Math.pow(2, cents / 1200);
  } else {
    source.buffer = ksBuffer(ac, midi);
    source.playbackRate.value = Math.pow(2, cents / 1200);
  }
  const gain = ac.createGain();
  gain.gain.value = (sample ? 0.75 : 0.5) * level * (0.9 + Math.random() * 0.2);
  source.connect(gain);
  gain.connect(target.bus);
  source.start(Math.max(ac.currentTime, when + (Math.random() - 0.5) * 0.006));
  target.sources.push(source);
}

/**
 * Precalienta el audio al montar la UI: crea el contexto y DECODIFICA los
 * samples, de modo que el primer play ya use el instrumento real.
 */
export function preloadAudio(): void {
  try {
    audioContext();
    void readyContext();
  } catch {
    // Sin módulo nativo (p. ej. en tests): los samples se decodificarán en
    // el primer play, protegidos por whenSamplesReady.
  }
}

function createBus(ac: AudioContext): Scheduled {
  const bus = ac.createGain();
  bus.gain.value = 1;
  bus.connect(sampleBuffers ? sampleInput! : ksInput!);
  return { sources: [], bus };
}

/** Detiene todo lo agendado en un bus, con un fundido corto para no hacer click. */
function stopScheduled(ac: AudioContext, scheduled: Scheduled): void {
  const now = ac.currentTime;
  scheduled.bus.gain.setTargetAtTime(0, now, 0.03);
  for (const source of scheduled.sources) {
    try {
      source.stop(now + 0.15);
    } catch {
      // ya detenida o nunca inició: ignorar
    }
  }
  setTimeout(() => {
    try {
      scheduled.bus.disconnect();
    } catch {
      // ya desconectado
    }
  }, 300);
}

/** Corre `fn` con el contexto listo (sesión activa) y los samples cargados. */
function withAudio(fn: (ac: AudioContext) => void): void {
  const ac = audioContext();
  void readyContext().then(() => whenSamplesReady(() => fn(ac)));
}

/** Rasgueo: las cuerdas suenan con un pequeño desfase, de la grave a la aguda. */
export function playChord(midiNotes: Midi[], strumMs = 26): void {
  if (midiNotes.length === 0) return;
  withAudio((ac) => {
    const target = createBus(ac);
    const start = ac.currentTime + 0.02;
    midiNotes.forEach((midi, i) => scheduleNote(ac, target, midi, start + (i * strumMs) / 1000, 0.66));
  });
}

/** Arpegio: nota por nota. */
export function playArpeggio(midiNotes: Midi[], noteMs = 320): void {
  if (midiNotes.length === 0) return;
  withAudio((ac) => {
    const target = createBus(ac);
    const start = ac.currentTime + 0.02;
    midiNotes.forEach((midi, i) => scheduleNote(ac, target, midi, start + (i * noteMs) / 1000, 0.6));
  });
}

export interface PlaybackHandle {
  cancel: () => void;
  totalMs: number;
}

/**
 * Melodía: una nota por vez, con aviso a la UI para ir marcando cuál suena.
 * Se puede cortar en cualquier momento — es lo que usan las escalas.
 */
export function playMelody(midiNotes: Midi[], noteMs = 220, onNote?: (index: number) => void): PlaybackHandle {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let target: Scheduled | null = null;
  let cancelled = false;
  let ctxRef: AudioContext | null = null;
  const totalMs = midiNotes.length * noteMs + 500;

  withAudio((ac) => {
    if (cancelled) return;
    ctxRef = ac;
    target = createBus(ac);
    const start = ac.currentTime + 0.05;
    midiNotes.forEach((midi, i) => {
      const when = start + (i * noteMs) / 1000;
      scheduleNote(ac, target!, midi, when, 0.62);
      if (onNote) {
        timers.push(setTimeout(() => onNote(i), Math.max(0, (when - ac.currentTime) * 1000)));
      }
    });
  });

  return {
    cancel: () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (target && ctxRef) stopScheduled(ctxRef, target);
    },
    totalMs,
  };
}

/**
 * Progresión: un rasgueo por acorde. `beatsList` (opcional) da la duración
 * relativa de cada acorde en tiempos; sin ella, todos duran igual.
 */
export function playProgression(
  chords: Midi[][],
  beatMs = 900,
  onChord?: (index: number) => void,
  beatsList?: number[],
): PlaybackHandle {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let target: Scheduled | null = null;
  let cancelled = false;
  let ctxRef: AudioContext | null = null;

  let totalMs = 600;
  for (let i = 0; i < chords.length; i++) totalMs += beatMs * (beatsList?.[i] ?? 1);

  withAudio((ac) => {
    if (cancelled) return;
    ctxRef = ac;
    target = createBus(ac);
    const start = ac.currentTime + 0.05;
    let offsetMs = 0;
    chords.forEach((notes, i) => {
      const when = start + offsetMs / 1000;
      notes.forEach((midi, j) => scheduleNote(ac, target!, midi, when + (j * 26) / 1000, 0.66));
      if (onChord) {
        timers.push(setTimeout(() => onChord(i), Math.max(0, (when - ac.currentTime) * 1000)));
      }
      offsetMs += beatMs * (beatsList?.[i] ?? 1);
    });
  });

  return {
    cancel: () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (target && ctxRef) stopScheduled(ctxRef, target);
    },
    totalMs,
  };
}
