import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { PositionNote, ScalePosition } from "@core/engine/scale-fretboard";
import { Lick, PATTERNS, Pattern, applyPattern, availableLicks, renderLick } from "@core/engine/scale-patterns";
import { Scale } from "@core/engine/scales";
import { PlaybackHandle, playMelody } from "@/audio/synth";
import { fretKey } from "@/diagrams/FretboardDiagram";
import { ScaleBoxDiagram } from "@/diagrams/ScaleBoxDiagram";
import { TabStaff } from "@/diagrams/TabStaff";
import { space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Button, Card, Chip, ChipRow, Segmented, Slider } from "@/ui";

interface Props {
  scale: Scale;
  position: ScalePosition;
  /** Para que el mástil de arriba también marque la nota que suena. */
  onActiveNote?: (key: string | null) => void;
}

type Mode = "secuencias" | "frases";

/** Secuencias mecánicas y frases idiomáticas sobre la caja elegida. */
export function ScalePractice({ scale, position, onActiveNote }: Props) {
  const t = useTheme();
  const [mode, setMode] = useState<Mode>("secuencias");
  const [patternId, setPatternId] = useState<string>("up");
  const [lickId, setLickId] = useState<string | null>(null);
  const [bpm, setBpm] = useState(80);
  const [loop, setLoop] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const handleRef = useRef<PlaybackHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const licks = useMemo(() => availableLicks(scale), [scale]);

  // Al cambiar de escala puede desaparecer la frase elegida: se cae a la primera disponible.
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

  // Cambiar de escala, de caja o de secuencia invalida lo que esté sonando.
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
    <View style={{ gap: space.md }}>
      <Segmented
        value={effectiveMode}
        onChange={setMode}
        options={[
          { value: "secuencias", label: "Secuencias" },
          { value: "frases", label: "Frases", disabled: licks.length === 0 },
        ]}
      />
      <AppText variant="muted">
        {effectiveMode === "secuencias" ? "Ejercicios mecánicos sobre la caja elegida." : "Frases hechas: música, no ejercicios."}
      </AppText>

      <ChipRow scroll>
        {effectiveMode === "secuencias"
          ? PATTERNS.map((p) => <Chip key={p.id} label={p.name} size="sm" active={patternId === p.id} onPress={() => setPatternId(p.id)} />)
          : licks.map((l) => <Chip key={l.id} label={l.name} size="sm" active={lick?.id === l.id} onPress={() => setLickId(l.id)} />)}
      </ChipRow>

      <AppText>{effectiveMode === "secuencias" ? pattern.note : (lick?.note ?? "")}</AppText>

      <Card padding={space.md} style={{ gap: space.sm }}>
        <View style={styles.controls}>
          {isPlaying ? (
            <Button title="Parar" icon="stop" variant="playing" onPress={stop} />
          ) : (
            <Button title="Tocar" icon="play" onPress={play} />
          )}
          <View style={styles.loop}>
            <AppText variant="muted">Repetir</AppText>
            <Switch value={loop} onValueChange={setLoop} trackColor={{ true: t.accent }} />
          </View>
          <AppText variant="caption" style={{ marginLeft: "auto" }}>
            {notes.length} notas · {sequence.grouping === 3 ? "tresillos" : sequence.grouping === 4 ? "semicorcheas" : "corcheas"}
          </AppText>
        </View>
        <Slider label="Tempo" value={bpm} min={40} max={180} onChange={setBpm} display={`${bpm} BPM`} />
      </Card>

      <Card padding={space.md}>
        {notes.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TabStaff notes={notes} activeIndex={activeIndex} grouping={sequence.grouping} footer="degree" />
          </ScrollView>
        ) : (
          <AppText variant="muted">Esta secuencia no entra en la caja elegida. Probá con otra caja.</AppText>
        )}
      </Card>

      <Card padding={space.md} style={{ alignItems: "center" }}>
        <ScaleBoxDiagram position={position} labelMode="degree" active={activeIndex !== null && notes[activeIndex] ? fretKey(notes[activeIndex]) : null} size="sm" />
        <AppText variant="caption" style={{ marginTop: 4 }}>
          {position.label}
        </AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  loop: { flexDirection: "row", alignItems: "center", gap: 6 },
});
