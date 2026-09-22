import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Progression, progressionsFor } from "@core/engine/scale-harmony";
import { Scale } from "@core/engine/scales";
import { PlaybackHandle, playProgression } from "@/audio/synth";
import { ChordDiagram } from "@/diagrams/ChordDiagram";
import { bestVoicing } from "@/features/chords/bestVoicing";
import { radius, space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Button, Card, Slider } from "@/ui";

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
  const t = useTheme();
  const isPlaying = playing?.progression === index;

  return (
    <Card padding={space.md}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">{progression.name}</AppText>
          <AppText variant="monoSmall" color={t.accent}>
            {progression.chords.map((c) => c.roman).join(" · ")}
          </AppText>
        </View>
        {isPlaying ? (
          <Button title="Parar" icon="stop" size="sm" variant="playing" onPress={onStop} />
        ) : (
          <Button title="Escuchar" icon="play" size="sm" variant="secondary" onPress={() => onPlay(index)} />
        )}
      </View>
      <AppText variant="muted" style={{ marginTop: 4 }}>
        {progression.note}
      </AppText>

      <View style={styles.grid}>
        {progression.chords.map((chord, i) => {
          const voicing = bestVoicing(chord.chord);
          const active = isPlaying && playing?.chord === i;
          return (
            <View
              key={`${chord.symbol}-${i}`}
              style={[
                styles.chordCell,
                { borderColor: active ? t.playingBorder : t.border, backgroundColor: active ? t.warnBg : "transparent" },
              ]}
            >
              <View style={styles.chordHead}>
                <AppText weight="600" style={{ fontSize: 13 }}>
                  {chord.symbol}
                </AppText>
                <AppText variant="monoSmall">{chord.roman}</AppText>
              </View>
              {voicing ? <ChordDiagram frets={voicing.frets} barre={voicing.barre} size="sm" /> : <AppText variant="caption">sin posición</AppText>}
              <AppText variant="caption">
                {chord.bars} {chord.bars === 1 ? "compás" : "compases"}
              </AppText>
            </View>
          );
        })}
      </View>
      <AppText variant="caption" style={{ marginTop: 6 }}>
        A {bpm} BPM, 4 tiempos por compás.
      </AppText>
    </Card>
  );
}

/** Progresiones donde la escala funciona de punta a punta, para puntear encima. */
export function ScaleProgressions({ scale }: { scale: Scale }) {
  const progressions = useMemo(() => progressionsFor(scale), [scale]);
  const [playing, setPlaying] = useState<PlayState | null>(null);
  const [bpm, setBpm] = useState(92);
  const handleRef = useRef<PlaybackHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    handleRef.current?.cancel();
    handleRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(null);
  };

  // Al cambiar de escala (o al salir), lo que estaba sonando ya no corresponde.
  useEffect(() => stop, [scale]);

  const play = (index: number) => {
    stop();
    const progression = progressions[index];
    const voicings = progression.chords.map((c) => bestVoicing(c.chord));
    const notes = voicings.map((v) => v?.midiNotes ?? []);
    if (notes.every((n) => n.length === 0)) return;
    const beats = progression.chords.map((c) => c.bars * 4);
    const handle = playProgression(notes, Math.round(60000 / bpm), (chord) => setPlaying({ progression: index, chord }), beats);
    handleRef.current = handle;
    setPlaying({ progression: index, chord: 0 });
    timerRef.current = setTimeout(stop, handle.totalMs);
  };

  if (progressions.length === 0) {
    return (
      <Card>
        <AppText variant="muted">
          No tengo progresiones típicas para esta escala. Mirá la pestaña de acordes: cualquier secuencia armada con
          esos acordes se puede puntear con {scale.name}.
        </AppText>
      </Card>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <AppText variant="muted">
        Progresiones donde <AppText weight="600" style={{ fontSize: 14 }}>{scale.name}</AppText> funciona de punta a punta. Poné una a sonar y
        punteá encima.
      </AppText>
      <Slider label="Tempo" value={bpm} min={50} max={180} onChange={setBpm} display={`${bpm} BPM`} />
      {progressions.map((progression, i) => (
        <ProgressionCard key={progression.name} progression={progression} index={i} playing={playing} bpm={bpm} onPlay={play} onStop={stop} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chordCell: { width: "23%", flexGrow: 1, alignItems: "center", borderRadius: radius.md, borderWidth: 1, padding: 6, gap: 2 },
  chordHead: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", alignItems: "baseline" },
});
