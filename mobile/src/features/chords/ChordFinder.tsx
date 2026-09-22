import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { identifyChord } from "@core/engine/identify";
import { BARITONE } from "@core/engine/notes";
import { Fret, displayFrets, parseFretString } from "@core/engine/voicings";
import { playChord } from "@/audio/synth";
import { ChordDiagram } from "@/diagrams/ChordDiagram";
import { selectionFeedback } from "@/lib/haptics";
import { space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Badge, Button, Card, Chip, ChipRow, Field, Notice } from "@/ui";

const MAX_FRET = 12;

/**
 * Identificador: marcá qué traste pisás en cada cuerda (o escribí "2-1-0-0")
 * y te digo qué acorde estás tocando.
 */
export function ChordFinder() {
  const t = useTheme();
  const [frets, setFrets] = useState<Fret[]>([2, 1, 0, 0]);
  const [text, setText] = useState("2-1-0-0");

  const result = useMemo(() => identifyChord(frets), [frets]);

  const setFret = (stringIdx: number, fret: Fret) => {
    selectionFeedback();
    const next = [...frets];
    next[stringIdx] = fret;
    setFrets(next);
    setText(displayFrets(next));
  };

  const onText = (value: string) => {
    setText(value);
    const parsed = parseFretString(value);
    if (parsed && parsed.every((f) => f === null || f <= 24)) setFrets(parsed);
  };

  const textValid = parseFretString(text) !== null;

  return (
    <View style={{ gap: space.lg }}>
      <Card padding={space.md} style={{ gap: space.md }}>
        {BARITONE.labels.map((label, stringIdx) => (
          <View key={label} style={styles.stringRow}>
            <AppText variant="subheading" style={{ width: 22 }}>
              {label}
            </AppText>
            <ChipRow scroll style={{ paddingRight: 8 }}>
              <Chip label="×" mono size="sm" minWidth={34} solid active={frets[stringIdx] === null} onPress={() => setFret(stringIdx, null)} />
              {Array.from({ length: MAX_FRET + 1 }, (_, f) => (
                <Chip key={f} label={String(f)} mono size="sm" minWidth={34} solid active={frets[stringIdx] === f} onPress={() => setFret(stringIdx, f)} />
              ))}
            </ChipRow>
          </View>
        ))}
        <View style={styles.textRow}>
          <Field mono value={text} onChangeText={onText} placeholder="2-1-0-0 o x-6-5-4" style={{ flex: 1 }} returnKeyType="done" />
          {result.matches.length > 0 && (
            <Button title="Escuchar" icon="play" variant="secondary" onPress={() => playChord(result.matches[0].voicing.midiNotes)} />
          )}
        </View>
        {!textValid && text.trim() !== "" && (
          <AppText variant="caption" color={t.dangerText}>
            Cuatro valores separados por guiones, en orden D–G–B–E. La x es una cuerda silenciada.
          </AppText>
        )}
      </Card>

      <View style={styles.resultRow}>
        <Card padding={space.md} style={{ alignItems: "center" }}>
          <ChordDiagram frets={frets} size="lg" />
          <AppText variant="caption" style={{ marginTop: 4 }}>
            Notas: <AppText variant="monoSmall">{result.noteNames.join(" ") || "—"}</AppText>
          </AppText>
        </Card>

        <View style={{ flex: 1, gap: 8, minWidth: 180 }}>
          {result.matches.length === 0 && (
            <Notice kind="warn" message="Estas notas no forman ningún acorde que conozca. Puede ser un cluster o faltar una nota que lo defina." />
          )}
          {result.matches.slice(0, 8).map((m, i) => (
            <Card key={m.symbol} padding={space.md} highlight={i === 0}>
              <View style={styles.matchHead}>
                <AppText variant="heading">{m.symbol}</AppText>
                {i === 0 && <Badge label="mejor interpretación" tone="accent" />}
                <View style={{ flex: 1 }} />
                <AppText variant="caption">{(m.confidence * 100).toFixed(0)}%</AppText>
              </View>
              <AppText variant="caption" color={t.textMuted}>
                {m.exact ? "Acorde completo" : `Parcial — omite ${m.omitted.join(", ")}`} · {m.inversion}
              </AppText>
            </Card>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stringRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  textRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultRow: { flexDirection: "row", flexWrap: "wrap", gap: space.md, alignItems: "flex-start" },
  matchHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
});
