import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { parseChordFlexible } from "@core/engine/chords";
import { DetectedKey, romanNumeral } from "@core/engine/key-detect";
import { OptimizeResult, OptimizedOccurrence } from "@core/engine/optimizer";
import { Voicing } from "@core/engine/voicings";
import { playArpeggio, playChord } from "@/audio/synth";
import { ChordDiagram } from "@/diagrams/ChordDiagram";
import { difficultyLabel } from "@/lib/difficulty";
import { tapFeedback } from "@/lib/haptics";
import { radius, space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Badge, Button, Card, Field, IconButton, Notice, Section, Stepper } from "@/ui";

interface Props {
  working: OptimizedOccurrence | null;
  songKey: DetectedKey | null;
  locks: Record<number, string>;
  result: OptimizeResult | null;
  beats?: number;
  startEditing?: boolean;
  onApply: (occurrenceIndex: number, display: string, wholeSong: boolean) => void;
  onClearLocks: (symbol: string) => void;
  onEditChord: (occurrenceIndex: number, newSymbol: string, wholeSong: boolean) => void;
  onRevertEdit: (occurrenceIndex: number) => void;
  onSetBeats: (occurrenceIndex: number, beats: number) => void;
  onClose: () => void;
}

function MiniVoicing({
  voicing,
  onUseEverywhere,
  onUseHere,
}: {
  voicing: Voicing;
  onUseEverywhere: () => void;
  onUseHere: () => void;
}) {
  const t = useTheme();
  const diff = difficultyLabel(voicing.difficulty);
  return (
    <View style={[styles.mini, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={{ alignSelf: "flex-start" }}>
        <Badge label={String(voicing.difficulty)} tone={diff.tone} mono />
      </View>
      <Pressable
        onPress={() => {
          tapFeedback();
          playChord(voicing.midiNotes);
        }}
        accessibilityLabel={`Escuchar ${voicing.display}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignItems: "center" })}
      >
        <ChordDiagram frets={voicing.frets} barre={voicing.barre} size="lg" />
      </Pressable>
      <AppText variant="mono" align="center">
        {voicing.display}
      </AppText>
      {voicing.omitted.length > 0 && (
        <AppText variant="caption" color={t.orangeText} align="center">
          omite {voicing.omitted.map((o) => o.split(" ")[0]).join(", ")}
        </AppText>
      )}
      {voicing.bassDegree !== "1" && (
        <AppText variant="caption" align="center">
          {voicing.inversion}
        </AppText>
      )}
      <View style={{ gap: 4, marginTop: 6, alignSelf: "stretch" }}>
        <Button title="En toda la canción" size="sm" block onPress={onUseEverywhere} />
        <Button title="Solo aquí" size="sm" variant="subtle" block onPress={onUseHere} />
      </View>
    </View>
  );
}

/**
 * Mesa de trabajo de un acorde: la posición actual, cambiar el acorde
 * (E → E7), su duración, y todas las posiciones alternativas para
 * reemplazarla en toda la canción o solo en esta aparición.
 */
export function ChordWorkbench({
  working,
  songKey,
  locks,
  result,
  beats = 1,
  startEditing = false,
  onApply,
  onClearLocks,
  onEditChord,
  onRevertEdit,
  onSetBeats,
  onClose,
}: Props) {
  const t = useTheme();
  const symbol = working?.occurrence.chord.normalized ?? "";
  const index = working?.occurrence.index ?? -1;

  const [editValue, setEditValue] = useState(symbol);
  const [editError, setEditError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(startEditing);

  // Al cambiar de acorde (otra aparición, o el símbolo tras una edición) el
  // formulario arranca de cero. Se ajusta durante el render, no en un efecto:
  // así no hay un frame con el símbolo viejo en el campo.
  const [seen, setSeen] = useState({ symbol, index });
  if (seen.symbol !== symbol || seen.index !== index) {
    setSeen({ symbol, index });
    setEditValue(symbol);
    setEditError(null);
    if (seen.index !== index) setEditOpen(startEditing);
  }

  const applyEdit = (wholeSong: boolean) => {
    const value = editValue.trim();
    if (!value || value === symbol) return;
    const parsed = parseChordFlexible(value);
    if (!parsed.ok) {
      setEditError(parsed.error.message);
      return;
    }
    setEditError(null);
    onEditChord(index, value, wholeSong);
  };

  const v = working?.voicing;
  const roman = working && songKey ? romanNumeral(working.occurrence.chord, songKey) : null;
  const isDiatonic = songKey ? !songKey.nonDiatonic.includes(symbol) : true;
  const occurrencesOfSymbol = result?.occurrences.filter((o) => o.occurrence.chord.normalized === symbol) ?? [];
  const symbolHasLocks = occurrencesOfSymbol.some((o) => locks[o.occurrence.index]);
  const canEdit = editValue.trim() !== "" && editValue.trim() !== symbol;

  return (
    <Modal visible={working !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={["bottom"]} style={[styles.sheet, { backgroundColor: t.bg }]}>
        {working && v && (
          <>
            <View style={[styles.head, { borderBottomColor: t.border }]}>
              <View style={styles.titleRow}>
                <AppText variant="title">{symbol}</AppText>
                {roman && <Badge label={isDiatonic ? roman : `${roman} · prestado`} tone={isDiatonic ? "neutral" : "purple"} />}
                <AppText variant="caption">×{occurrencesOfSymbol.length} en la canción</AppText>
              </View>
              <IconButton icon="close" label="Cerrar" onPress={onClose} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {/* Posición actual + controles */}
              <Card highlight>
                <View style={styles.current}>
                  <ChordDiagram frets={v.frets} barre={v.barre} size="xl" />
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="mono" style={{ fontSize: 16, fontWeight: "600", color: t.text }}>
                      {v.display}
                    </AppText>
                    <AppText>{v.noteNames.join(" ")}</AppText>
                    <AppText variant="muted">
                      Bajo {v.bassNote} · {v.inversion}
                    </AppText>
                    {v.omitted.length > 0 && (
                      <AppText variant="muted" color={t.orangeText} weight="600">
                        Omite {v.omitted.join(", ")}
                      </AppText>
                    )}
                    <View style={styles.playRow}>
                      <Button title="Rasgueo" icon="play" size="sm" variant="secondary" onPress={() => playChord(v.midiNotes)} />
                      <Button title="Arpegio" icon="musical-notes-outline" size="sm" variant="subtle" onPress={() => playArpeggio(v.midiNotes)} />
                    </View>
                  </View>
                </View>
                <View style={styles.beatsRow}>
                  <AppText variant="muted">Duración</AppText>
                  <Stepper
                    label="duración"
                    value={beats}
                    min={0.5}
                    max={8}
                    step={0.5}
                    onChange={(b) => onSetBeats(index, b)}
                    format={(b) => `${b} ${b === 1 ? "tiempo" : "tiempos"}`}
                  />
                </View>
                {symbolHasLocks && (
                  <Button
                    title="Volver a la elección automática"
                    icon="lock-open-outline"
                    variant="ghost"
                    size="sm"
                    onPress={() => onClearLocks(symbol)}
                    style={{ marginTop: 4 }}
                  />
                )}
              </Card>

              {/* Cambiar acorde */}
              <View>
                <Button
                  title={editOpen ? "Cerrar edición" : "Cambiar este acorde (por ej. E → E7)"}
                  icon={editOpen ? "chevron-up" : "create-outline"}
                  variant="ghost"
                  size="sm"
                  onPress={() => setEditOpen((o) => !o)}
                />
                {editOpen && (
                  <Card style={{ marginTop: 6 }} padding={space.md}>
                    <Field
                      autoFocus
                      mono
                      value={editValue}
                      onChangeText={(text) => {
                        setEditValue(text);
                        setEditError(null);
                      }}
                      onSubmitEditing={() => applyEdit(true)}
                      returnKeyType="done"
                      placeholder="E7, Am, G/B…"
                    />
                    <View style={[styles.playRow, { marginTop: 8 }]}>
                      <Button title={`Todos los ${working.occurrence.originalSymbol ?? symbol}`} size="sm" disabled={!canEdit} onPress={() => applyEdit(true)} />
                      <Button title="Solo esta aparición" size="sm" variant="subtle" disabled={!canEdit} onPress={() => applyEdit(false)} />
                    </View>
                    {editError && <Notice kind="danger" message={editError} style={{ marginTop: 8 }} />}
                    {working.occurrence.originalSymbol && (
                      <Button
                        title={`Volver al original (${working.occurrence.originalSymbol})`}
                        icon="arrow-undo-outline"
                        variant="ghost"
                        size="sm"
                        onPress={() => onRevertEdit(index)}
                        style={{ marginTop: 4 }}
                      />
                    )}
                  </Card>
                )}
              </View>

              {/* Otras posiciones */}
              {working.alternatives.length > 0 && (
                <Section title={`Otras posiciones (${working.alternatives.length})`} hint="Elegí una para reemplazar la actual.">
                  <View style={styles.grid}>
                    {working.alternatives.map((alt) => (
                      <MiniVoicing
                        key={alt.display}
                        voicing={alt}
                        onUseEverywhere={() => onApply(index, alt.display, true)}
                        onUseHere={() => onApply(index, alt.display, false)}
                      />
                    ))}
                  </View>
                </Section>
              )}
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  current: { flexDirection: "row", gap: space.lg, alignItems: "flex-start" },
  playRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 6 },
  beatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mini: {
    width: "47%",
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 8,
    alignItems: "center",
    gap: 2,
  },
});
