"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BARITONE } from "@/lib/engine/notes";
import {
  DEFAULT_A4,
  IN_TUNE_CENTS,
  StringTarget,
  TuningVerdict,
  centsBetween,
  instructionFor,
  nearestString,
  readNote,
  stringTargets,
  verdictFor,
} from "@/lib/engine/tuning";
import { PitchTracker, detectPitch } from "@/lib/audio/pitch";
import { Microphone, MicrophoneError, openMicrophone } from "@/lib/audio/microphone";
import { playChord, preloadAudio } from "@/lib/audio/synth";
import TunerGauge from "@/components/TunerGauge";

type Mode = "cuerdas" | "cromatico";

interface Reading {
  frequency: number;
  /** Cuerda contra la que se compara (null en cromático o sin coincidencia). */
  target: StringTarget | null;
  cents: number;
  verdict: TuningVerdict;
  /** Nombre a mostrar en grande. */
  note: string;
}

/** Milisegundos que hay que sostener la afinación para dar la cuerda por lista. */
const HOLD_MS = 700;
/** Debajo de esta claridad, lo que entra por el micrófono no es una cuerda. */
const MIN_CLARITY = 0.82;
/**
 * Cada cuánto se analiza el audio. Va por temporizador y no por
 * requestAnimationFrame a propósito: el navegador congela los frames cuando la
 * pestaña pasa a segundo plano, y un afinador que se queda clavado en la última
 * lectura hace girar la clavija para el lado equivocado.
 */
const ANALYSIS_MS = 40;

export default function TunerPage() {
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [level, setLevel] = useState(0);
  const [mode, setMode] = useState<Mode>("cuerdas");
  const [pinned, setPinned] = useState<number | null>(null);
  const [a4, setA4] = useState(DEFAULT_A4);
  const [done, setDone] = useState<Record<number, boolean>>({});

  const micRef = useRef<Microphone | null>(null);
  const trackerRef = useRef(new PitchTracker());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inTuneSinceRef = useRef<{ index: number; at: number } | null>(null);
  // Mientras suena el tono de referencia, el micrófono se escucharía a sí mismo.
  const muteUntilRef = useRef(0);

  // Los objetivos dependen de la referencia: cambiar el La mueve las cuatro.
  const targets = useMemo(() => stringTargets(BARITONE, a4), [a4]);

  // El bucle de audio corre a 60 fps y no puede reiniciarse cada vez que el
  // usuario mueve un control: lee los ajustes de acá.
  const settingsRef = useRef({ mode, pinned, targets, a4 });
  useEffect(() => {
    settingsRef.current = { mode, pinned, targets, a4 };
  }, [mode, pinned, targets, a4]);

  useEffect(() => {
    preloadAudio();
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
    micRef.current?.stop();
    micRef.current = null;
    trackerRef.current.reset();
    inTuneSinceRef.current = null;
    setListening(false);
    setReading(null);
    setLevel(0);
  }, []);

  useEffect(() => stop, [stop]);

  const analyze = useCallback(() => {
    const mic = micRef.current;
    if (!mic) return;

    // Con la pestaña oculta no hay nadie mirando: no tiene sentido gastar CPU
    // ni dejar un número viejo en pantalla.
    if (document.hidden) {
      trackerRef.current.reset();
      setReading(null);
      return;
    }

    if (performance.now() < muteUntilRef.current) {
      trackerRef.current.reset();
      setReading(null);
      return;
    }

    const result = detectPitch(mic.read(), mic.sampleRate);
    setLevel(result.level);

    const usable = result.clarity >= MIN_CLARITY ? result.frequency : null;
    const frequency = trackerRef.current.push(usable);

    if (frequency === null) {
      setReading(null);
      inTuneSinceRef.current = null;
      return;
    }

    const { mode: currentMode, pinned: pin, targets: currentTargets, a4: currentA4 } =
      settingsRef.current;
    let next: Reading;

    if (currentMode === "cromatico") {
      const note = readNote(frequency, currentA4);
      next = {
        frequency,
        target: null,
        cents: note.cents,
        verdict: verdictFor(note.cents),
        note: note.fullName,
      };
    } else {
      const target =
        pin !== null ? currentTargets[pin] : (nearestString(frequency, currentTargets)?.target ?? null);
      if (target) {
        const cents = centsBetween(frequency, target.frequency);
        next = {
          frequency,
          target,
          cents,
          verdict: verdictFor(cents),
          note: target.fullName,
        };
      } else {
        // Suena algo que no es ninguna de las cuatro cuerdas: se dice qué es
        // en vez de mandar a girar la clavija equivocada.
        const note = readNote(frequency, currentA4);
        next = {
          frequency,
          target: null,
          cents: note.cents,
          verdict: verdictFor(note.cents),
          note: note.fullName,
        };
      }
    }

    setReading(next);

    // Una cuerda se marca como lista recién cuando se sostuvo afinada.
    if (next.target && Math.abs(next.cents) <= IN_TUNE_CENTS) {
      const held = inTuneSinceRef.current;
      const now = performance.now();
      if (held && held.index === next.target.index) {
        if (now - held.at >= HOLD_MS) {
          setDone((current) =>
            current[next.target!.index] ? current : { ...current, [next.target!.index]: true },
          );
        }
      } else {
        inTuneSinceRef.current = { index: next.target.index, at: now };
      }
    } else {
      inTuneSinceRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const mic = await openMicrophone({ fftSize: 4096 });
      micRef.current = mic;
      trackerRef.current.reset();
      setListening(true);
      timerRef.current = setInterval(analyze, ANALYSIS_MS);
    } catch (caught) {
      setError(
        caught instanceof MicrophoneError
          ? caught.message
          : "No pude abrir el micrófono. Probá recargar la página.",
      );
    } finally {
      setStarting(false);
    }
  }, [analyze]);

  /** Toca la cuerda al aire para afinar de oído, sin que el afinador se escuche. */
  const playReference = useCallback((target: StringTarget) => {
    muteUntilRef.current = performance.now() + 2600;
    trackerRef.current.reset();
    setReading(null);
    playChord([target.midi]);
  }, []);

  const allDone = targets.every((t) => done[t.index]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Afinador</h1>
        <p className="text-sm text-stone-500">
          Afiná el barítono al oído del micrófono: tocá una cuerda al aire y girá la clavija hasta
          que la aguja quede en el centro.
        </p>
      </div>

      {/* Control principal */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => (listening ? stop() : start())}
          disabled={starting}
          className={`rounded-lg px-4 py-2 font-medium text-white disabled:opacity-50 ${
            listening ? "bg-amber-500 hover:bg-amber-600" : "bg-teal-700 hover:bg-teal-800"
          }`}
        >
          {starting ? "Pidiendo permiso…" : listening ? "■ Detener" : "🎤 Empezar a afinar"}
        </button>

        <div className="flex rounded-lg border border-stone-300 bg-white p-0.5 text-sm">
          {(["cuerdas", "cromatico"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1 ${
                mode === m ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {m === "cuerdas" ? "Cuerdas" : "Cromático"}
            </button>
          ))}
        </div>

        {listening && (
          <div className="flex items-center gap-2" title="Nivel de entrada">
            <span className="text-xs text-stone-400">Señal</span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-200">
              <div
                className={`h-full ${level > 0.008 ? "bg-teal-600" : "bg-stone-300"}`}
                style={{ width: `${Math.min(100, level * 900)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Dial */}
      <div className="flex flex-col items-center rounded-lg border border-stone-200 bg-white p-4">
        <TunerGauge
          cents={reading?.cents ?? null}
          verdict={reading?.verdict ?? null}
          note={reading?.note ?? "—"}
          detail={
            reading
              ? `${reading.frequency.toFixed(1)} Hz · ${reading.cents > 0 ? "+" : ""}${reading.cents.toFixed(0)} cents`
              : listening
                ? "esperando una cuerda"
                : "micrófono apagado"
          }
        />
        <p
          className={`mt-1 flex items-center gap-2 text-lg font-semibold ${
            !reading
              ? "text-stone-300"
              : reading.verdict === "afinada"
                ? "text-emerald-700"
                : "text-amber-700"
          }`}
        >
          {reading?.verdict === "baja" && <span aria-hidden>◀</span>}
          {reading
            ? instructionFor(reading.verdict, reading.cents)
            : listening
              ? "Tocá una cuerda"
              : " "}
          {reading?.verdict === "alta" && <span aria-hidden>▶</span>}
        </p>
        {reading && !reading.target && mode === "cuerdas" && (
          <p className="text-sm text-stone-500">
            Esta nota no es ninguna de las cuatro cuerdas al aire. Si estás afinando igual, fijate
            en el modo cromático.
          </p>
        )}
      </div>

      {/* Cuerdas */}
      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Cuerdas al aire
          </h2>
          <span className="text-xs text-stone-400">
            de la más grave a la más aguda · tocá una para escucharla
          </span>
          {Object.keys(done).length > 0 && (
            <button
              onClick={() => setDone({})}
              className="ml-auto text-xs text-stone-500 underline-offset-2 hover:underline"
            >
              Reiniciar
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {targets.map((target) => {
            const active = reading?.target?.index === target.index;
            const isPinned = pinned === target.index;
            const cents = active ? reading!.cents : null;
            return (
              <div
                key={target.index}
                className={`rounded-lg border p-3 text-center transition-colors ${
                  active
                    ? reading!.verdict === "afinada"
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-amber-500 bg-amber-50"
                    : done[target.index]
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-stone-200"
                }`}
              >
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-xl font-bold">{target.label}</span>
                  <span className="text-xs text-stone-400">{target.fullName}</span>
                  {done[target.index] && <span className="text-emerald-600">✓</span>}
                </div>
                <div className="font-mono text-[11px] text-stone-400">
                  {target.frequency.toFixed(1)} Hz
                </div>
                <div className="h-4 font-mono text-xs">
                  {cents !== null && (
                    <span
                      className={
                        Math.abs(cents) <= IN_TUNE_CENTS ? "text-emerald-700" : "text-amber-700"
                      }
                    >
                      {cents > 0 ? "+" : ""}
                      {cents.toFixed(0)}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex justify-center gap-1">
                  <button
                    onClick={() => playReference(target)}
                    className="rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-100"
                  >
                    ♪
                  </button>
                  <button
                    onClick={() => setPinned(isPinned ? null : target.index)}
                    title={
                      isPinned
                        ? "Volver a detectar la cuerda automáticamente"
                        : "Comparar siempre contra esta cuerda"
                    }
                    className={`rounded border px-2 py-0.5 text-xs ${
                      isPinned
                        ? "border-teal-600 bg-teal-700 text-white"
                        : "border-stone-300 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {isPinned ? "fijada" : "fijar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {allDone && (
          <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-center text-sm font-medium text-emerald-800">
            Las cuatro cuerdas afinadas. Volvé a repasarlas: al tensar una se mueven las demás.
          </p>
        )}
      </section>

      {/* Ajustes */}
      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-stone-600">Referencia</span>
            <input
              type="range"
              min={415}
              max={446}
              value={a4}
              onChange={(e) => setA4(Number(e.target.value))}
              className="w-36 accent-teal-700"
            />
            <span className="w-20 font-mono text-xs">La4 = {a4} Hz</span>
          </label>
          {a4 !== DEFAULT_A4 && (
            <button
              onClick={() => setA4(DEFAULT_A4)}
              className="text-xs text-stone-500 underline-offset-2 hover:underline"
            >
              Volver a 440
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-stone-400">
          Cambiá la referencia solo si vas a tocar con alguien afinado distinto. Con 440 Hz estás
          igual que cualquier otro instrumento.
        </p>
      </section>

      <details className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
        <summary className="cursor-pointer font-medium text-stone-800">
          Si no detecta bien
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Tocá una sola cuerda por vez y dejala sonar: si suenan dos, no hay una altura clara.</li>
          <li>Pulsá cerca del puente y sin fuerza: un golpe fuerte satura el micrófono.</li>
          <li>Apagá música de fondo y ventiladores. El detector necesita silencio alrededor.</li>
          <li>
            Si el micrófono está muy lejos, la barra de señal queda casi vacía: acercá el
            instrumento.
          </li>
          <li>
            ¿La cuerda está muy floja? Fijala con el botón <em>fijar</em>: así el afinador la
            compara contra esa cuerda aunque suene lejos de su nota.
          </li>
        </ul>
      </details>
    </div>
  );
}
