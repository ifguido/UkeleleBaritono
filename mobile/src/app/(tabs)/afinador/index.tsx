import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import { PitchTracker, detectPitch } from "@core/audio/pitch";
import { BARITONE } from "@core/engine/notes";
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
} from "@core/engine/tuning";
import { Microphone, MicrophoneError, openMicrophone } from "@/audio/microphone";
import { playChord, preloadAudio } from "@/audio/synth";
import { TunerGauge } from "@/diagrams/TunerGauge";
import { successFeedback } from "@/lib/haptics";
import { fonts } from "@/theme/fonts";
import { radius, space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Button, Card, Chip, Notice, Screen, Segmented, Slider } from "@/ui";

type Mode = "cuerdas" | "cromatico";

interface Reading {
  frequency: number;
  target: StringTarget | null;
  cents: number;
  verdict: TuningVerdict;
  note: string;
}

/** Milisegundos que hay que sostener la afinación para dar la cuerda por lista. */
const HOLD_MS = 700;
/** Debajo de esta claridad, lo que entra por el micrófono no es una cuerda. */
const MIN_CLARITY = 0.82;
/** Cada cuánto se analiza el audio. */
const ANALYSIS_MS = 40;
const KEEP_AWAKE_TAG = "afinador";

export default function TunerScreen() {
  const t = useTheme();
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [level, setLevel] = useState(0);
  const [mode, setMode] = useState<Mode>("cuerdas");
  const [pinned, setPinned] = useState<number | null>(null);
  const [a4, setA4] = useState(DEFAULT_A4);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [tipsOpen, setTipsOpen] = useState(false);

  const micRef = useRef<Microphone | null>(null);
  const trackerRef = useRef(new PitchTracker());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inTuneSinceRef = useRef<{ index: number; at: number } | null>(null);
  // Mientras suena el tono de referencia, el micrófono se escucharía a sí mismo.
  const muteUntilRef = useRef(0);
  // Espejo síncrono de `done`: el bucle de análisis decide sin esperar un render.
  const doneRef = useRef(new Set<number>());

  const targets = useMemo(() => stringTargets(BARITONE, a4), [a4]);

  // El bucle de audio no puede reiniciarse cada vez que el usuario mueve un
  // control: lee los ajustes de acá.
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
    const mic = micRef.current;
    micRef.current = null;
    void mic?.stop();
    trackerRef.current.reset();
    inTuneSinceRef.current = null;
    setListening(false);
    setReading(null);
    setLevel(0);
    void deactivateKeepAwake(KEEP_AWAKE_TAG);
  }, []);

  useEffect(() => stop, [stop]);

  // Al pasar a segundo plano se apaga el micrófono: nadie mira la pantalla y
  // el sistema igual corta la captura de audio a los pocos segundos.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && micRef.current) stop();
    });
    return () => sub.remove();
  }, [stop]);

  const analyze = useCallback(() => {
    const mic = micRef.current;
    if (!mic) return;

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

    const { mode: currentMode, pinned: pin, targets: currentTargets, a4: currentA4 } = settingsRef.current;
    let next: Reading;

    if (currentMode === "cromatico") {
      const note = readNote(frequency, currentA4);
      next = { frequency, target: null, cents: note.cents, verdict: verdictFor(note.cents), note: note.fullName };
    } else {
      const target = pin !== null ? currentTargets[pin] : (nearestString(frequency, currentTargets)?.target ?? null);
      if (target) {
        const cents = centsBetween(frequency, target.frequency);
        next = { frequency, target, cents, verdict: verdictFor(cents), note: target.fullName };
      } else {
        const note = readNote(frequency, currentA4);
        next = { frequency, target: null, cents: note.cents, verdict: verdictFor(note.cents), note: note.fullName };
      }
    }

    setReading(next);

    // Una cuerda se marca como lista recién cuando se sostuvo afinada.
    if (next.target && Math.abs(next.cents) <= IN_TUNE_CENTS) {
      const held = inTuneSinceRef.current;
      const now = performance.now();
      if (held && held.index === next.target.index) {
        if (now - held.at >= HOLD_MS) {
          const idx = next.target.index;
          if (!doneRef.current.has(idx)) {
            doneRef.current.add(idx);
            successFeedback();
            setDone((current) => ({ ...current, [idx]: true }));
          }
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
      void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    } catch (caught) {
      setError(caught instanceof MicrophoneError ? caught.message : "No pude abrir el micrófono. Probá cerrar y volver a abrir la app.");
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

  const allDone = targets.every((tg) => done[tg.index]);

  return (
    <Screen>
      <AppText variant="muted">
        Tocá una cuerda al aire y girá la clavija hasta que el indicador quede en el centro. El audio se analiza en el
        teléfono y no sale de él.
      </AppText>

      <View style={styles.controls}>
        <Button
          title={starting ? "Pidiendo permiso…" : listening ? "Detener" : "Empezar a afinar"}
          icon={listening ? "stop" : "mic"}
          variant={listening ? "playing" : "primary"}
          size="lg"
          disabled={starting}
          onPress={() => (listening ? stop() : void start())}
        />
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "cuerdas", label: "Cuerdas" },
            { value: "cromatico", label: "Cromático" },
          ]}
        />
      </View>

      {error && <Notice kind="danger" message={error} />}

      <Card style={{ alignItems: "center" }}>
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
        <AppText
          variant="heading"
          align="center"
          color={!reading ? t.borderStrong : reading.verdict === "afinada" ? "#059669" : "#d97706"}
        >
          {reading?.verdict === "baja" && "◀ "}
          {reading ? instructionFor(reading.verdict, reading.cents) : listening ? "Tocá una cuerda" : " "}
          {reading?.verdict === "alta" && " ▶"}
        </AppText>
        {reading && !reading.target && mode === "cuerdas" && (
          <AppText variant="muted" align="center" style={{ marginTop: 4 }}>
            Esta nota no es ninguna de las cuatro cuerdas al aire. Si estás afinando igual, fijate en el modo cromático.
          </AppText>
        )}
        {listening && (
          <View style={styles.signal}>
            <AppText variant="caption">Señal</AppText>
            <View style={[styles.signalTrack, { backgroundColor: t.faint }]}>
              <View
                style={[
                  styles.signalFill,
                  { width: `${Math.min(100, level * 900)}%`, backgroundColor: level > 0.008 ? t.accent : t.borderStrong },
                ]}
              />
            </View>
          </View>
        )}
      </Card>

      <Card>
        <View style={styles.stringsHead}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Cuerdas al aire</AppText>
            <AppText variant="caption">de la más grave a la más aguda · tocá ♪ para escucharla</AppText>
          </View>
          {Object.keys(done).length > 0 && <Button
              title="Reiniciar"
              variant="ghost"
              size="sm"
              onPress={() => {
                doneRef.current.clear();
                setDone({});
              }}
            />}
        </View>

        <View style={styles.stringsGrid}>
          {targets.map((target) => {
            const active = reading?.target?.index === target.index;
            const isPinned = pinned === target.index;
            const cents = active ? reading!.cents : null;
            const border = active ? (reading!.verdict === "afinada" ? "#059669" : "#d97706") : done[target.index] ? t.successBorder : t.border;
            const bg = active ? (reading!.verdict === "afinada" ? t.successBg : t.warnBg) : done[target.index] ? t.successBg : t.cardAlt;
            return (
              <View key={target.index} style={[styles.stringCard, { borderColor: border, backgroundColor: bg }]}>
                <View style={styles.stringTitle}>
                  <AppText variant="title">{target.label}</AppText>
                  <AppText variant="caption">{target.fullName}</AppText>
                  {done[target.index] && <AppText color="#059669">✓</AppText>}
                </View>
                <AppText variant="monoSmall">{target.frequency.toFixed(1)} Hz</AppText>
                <AppText style={{ fontFamily: fonts.mono, fontSize: 12, height: 18, color: cents !== null && Math.abs(cents) <= IN_TUNE_CENTS ? "#059669" : "#d97706" }}>
                  {cents !== null ? `${cents > 0 ? "+" : ""}${cents.toFixed(0)}` : ""}
                </AppText>
                <View style={styles.stringActions}>
                  <Pressable
                    onPress={() => playReference(target)}
                    accessibilityLabel={`Escuchar ${target.fullName}`}
                    style={({ pressed }) => [styles.noteBtn, { borderColor: t.borderStrong, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <AppText color={t.textMuted}>♪</AppText>
                  </Pressable>
                  <Chip label={isPinned ? "fijada" : "fijar"} size="sm" solid active={isPinned} onPress={() => setPinned(isPinned ? null : target.index)} />
                </View>
              </View>
            );
          })}
        </View>

        {allDone && (
          <Notice kind="success" message="Las cuatro cuerdas afinadas. Volvé a repasarlas: al tensar una se mueven las demás." style={{ marginTop: space.md }} />
        )}
      </Card>

      <Card>
        <Slider label="Referencia La4" value={a4} min={415} max={446} onChange={setA4} display={`${a4} Hz`} />
        {a4 !== DEFAULT_A4 && <Button title="Volver a 440" variant="ghost" size="sm" onPress={() => setA4(DEFAULT_A4)} />}
        <AppText variant="caption" style={{ marginTop: 4 }}>
          Cambiá la referencia solo si vas a tocar con alguien afinado distinto. Con 440 Hz estás igual que cualquier otro instrumento.
        </AppText>
      </Card>

      <Card padding={space.md}>
        <Button
          title="Si no detecta bien"
          icon={tipsOpen ? "chevron-up" : "chevron-down"}
          variant="ghost"
          size="sm"
          onPress={() => setTipsOpen((v) => !v)}
        />
        {tipsOpen && (
          <View style={{ gap: 6, marginTop: 6 }}>
            {[
              "Tocá una sola cuerda por vez y dejala sonar: si suenan dos, no hay una altura clara.",
              "Pulsá cerca del puente y sin fuerza: un golpe fuerte satura el micrófono.",
              "Apagá música de fondo y ventiladores. El detector necesita silencio alrededor.",
              "Si la barra de señal queda casi vacía, acercá el instrumento al micrófono del teléfono.",
              "¿La cuerda está muy floja? Fijala con el botón fijar: así se compara contra esa cuerda aunque suene lejos de su nota.",
            ].map((tip) => (
              <AppText key={tip} variant="muted">
                • {tip}
              </AppText>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  signal: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: space.sm },
  signalTrack: { width: 120, height: 6, borderRadius: 3, overflow: "hidden" },
  signalFill: { height: "100%" },
  stringsHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  stringsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: space.md },
  stringCard: { width: "48%", flexGrow: 1, borderRadius: radius.md, borderWidth: 1, padding: 10, alignItems: "center", gap: 2 },
  stringTitle: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  stringActions: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 4 },
  noteBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
