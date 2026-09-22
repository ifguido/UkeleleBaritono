import { Pressable, StyleSheet, View } from "react-native";
import { Voicing } from "@core/engine/voicings";
import { playArpeggio, playChord } from "@/audio/synth";
import { ChordDiagram } from "@/diagrams/ChordDiagram";
import { difficultyLabel } from "@/lib/difficulty";
import { tapFeedback } from "@/lib/haptics";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Badge, Button } from "@/ui";

interface Props {
  symbol: string;
  voicing: Voicing;
  highlight?: boolean;
  compact?: boolean;
}

/** Una posición con su diagrama, análisis y botones para escucharla. */
export function VoicingCard({ symbol, voicing, highlight, compact }: Props) {
  const t = useTheme();
  const diff = difficultyLabel(voicing.difficulty);
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: highlight ? t.accent : t.border }]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">{symbol}</AppText>
          <AppText variant="mono">{voicing.display}</AppText>
        </View>
        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <Badge label={`${diff.text} · ${voicing.difficulty}`} tone={diff.tone} />
          {voicing.exact ? <Badge label="exacto" /> : <Badge label="parcial" tone="orange" />}
        </View>
      </View>

      <Pressable
        onPress={() => {
          tapFeedback();
          playChord(voicing.midiNotes);
        }}
        onLongPress={() => playArpeggio(voicing.midiNotes)}
        accessibilityLabel={`Escuchar ${symbol} ${voicing.display} (mantené pulsado para el arpegio)`}
        style={({ pressed }) => [styles.diagram, { opacity: pressed ? 0.6 : 1 }]}
      >
        <ChordDiagram frets={voicing.frets} barre={voicing.barre} size={compact ? "md" : "lg"} />
      </Pressable>

      <View style={{ gap: 2 }}>
        <AppText variant="caption">
          <AppText variant="caption" color={t.textFaint}>Notas </AppText>
          <AppText variant="caption" color={t.textMuted}>{voicing.noteNames.join(" ")}</AppText>
        </AppText>
        <AppText variant="caption" color={t.textMuted}>
          {voicing.intervals.join("–")}
        </AppText>
        <AppText variant="caption" color={t.textMuted}>
          Bajo {voicing.bassNote} · {voicing.inversion}
        </AppText>
        {voicing.omitted.length > 0 && (
          <AppText variant="caption" color={t.orangeText} weight="600">
            Omitida: {voicing.omitted.join(", ")}
          </AppText>
        )}
        {voicing.added.length > 0 && (
          <AppText variant="caption" color={t.orangeText} weight="600">
            Añadida: {voicing.added.join(", ")}
          </AppText>
        )}
        {voicing.barre && <AppText variant="caption" color={t.textMuted}>Cejilla en traste {voicing.barre.fret}</AppText>}
      </View>

      <View style={styles.actions}>
        <Button title="Rasgueo" icon="play" size="sm" variant="subtle" onPress={() => playChord(voicing.midiNotes)} />
        <Button title="Arpegio" icon="musical-notes-outline" size="sm" variant="subtle" onPress={() => playArpeggio(voicing.midiNotes)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: 12, gap: 6 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  diagram: { alignItems: "center", justifyContent: "center", minHeight: 110 },
  actions: { flexDirection: "row", gap: 6, marginTop: "auto", paddingTop: 4 },
});
