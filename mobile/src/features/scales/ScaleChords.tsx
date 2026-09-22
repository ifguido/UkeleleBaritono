import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ScaleChord, chordsInScale, harmonizeScale, homeChord } from "@core/engine/scale-harmony";
import { Scale } from "@core/engine/scales";
import { playArpeggio, playChord } from "@/audio/synth";
import { ChordDiagram } from "@/diagrams/ChordDiagram";
import { bestVoicing } from "@/features/chords/bestVoicing";
import { tapFeedback } from "@/lib/haptics";
import { radius, space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Badge, Button, Card, Chip, ChipRow, Section } from "@/ui";

function ChordCell({ chord, subtitle }: { chord: ScaleChord; subtitle?: string }) {
  const t = useTheme();
  const voicing = useMemo(() => bestVoicing(chord.chord), [chord]);
  return (
    <View style={[styles.cell, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.cellHead}>
        <AppText weight="700" style={{ fontSize: 14 }}>
          {chord.symbol}
        </AppText>
        <AppText variant="monoSmall" color={t.accent}>
          {chord.roman}
        </AppText>
      </View>
      {subtitle && <AppText variant="caption">{subtitle}</AppText>}
      {voicing ? (
        <>
          <Pressable
            onPress={() => {
              tapFeedback();
              playChord(voicing.midiNotes);
            }}
            accessibilityLabel={`Escuchar ${chord.symbol}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignItems: "center", marginVertical: 2 })}
          >
            <ChordDiagram frets={voicing.frets} barre={voicing.barre} size="sm" />
          </Pressable>
          <AppText variant="monoSmall">{voicing.display}</AppText>
          {voicing.omitted.length > 0 && (
            <AppText variant="caption" color={t.orangeText} align="center">
              omite {voicing.omitted.map((o) => o.split(" ")[0]).join(", ")}
            </AppText>
          )}
        </>
      ) : (
        <AppText variant="caption" align="center" style={{ marginVertical: 12 }}>
          No entra en cuatro cuerdas
        </AppText>
      )}
    </View>
  );
}

/** Qué acordes salen de la escala: el acorde casa, la armonización y todos los compatibles. */
export function ScaleChords({ scale }: { scale: Scale }) {
  const t = useTheme();
  const [openDegree, setOpenDegree] = useState<number | null>(null);

  const home = useMemo(() => homeChord(scale), [scale]);
  const homeVoicing = useMemo(() => (home ? bestVoicing(home.chord) : null), [home]);
  const harmonized = useMemo(() => harmonizeScale(scale), [scale]);
  const groups = useMemo(() => chordsInScale(scale), [scale]);
  const totalChords = groups.reduce((sum, g) => sum + g.chords.length, 0);

  return (
    <View style={{ gap: space.xl }}>
      {home && (
        <Card highlight>
          <AppText variant="label" color={t.accent}>
            El acorde de la escala
          </AppText>
          <View style={styles.homeRow}>
            {homeVoicing && (
              <Pressable onPress={() => playChord(homeVoicing.midiNotes)} accessibilityLabel="Escuchar" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <ChordDiagram frets={homeVoicing.frets} barre={homeVoicing.barre} size="lg" />
              </Pressable>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="heading">{home.symbol}</AppText>
              <AppText variant="muted">{home.description}</AppText>
              <AppText variant="muted">
                Es el acorde sobre el que <AppText weight="600" style={{ fontSize: 14, color: t.text }}>{scale.name}</AppText> suena como en casa. Si estás
                improvisando y no sabés dónde parar, parás acá.
              </AppText>
              {homeVoicing && (
                <View style={styles.actions}>
                  <Button title="Rasgueo" icon="play" size="sm" variant="secondary" onPress={() => playChord(homeVoicing.midiNotes)} />
                  <Button title="Arpegio" icon="musical-notes-outline" size="sm" variant="subtle" onPress={() => playArpeggio(homeVoicing.midiNotes)} />
                </View>
              )}
            </View>
          </View>
        </Card>
      )}

      {harmonized.length > 0 ? (
        <Section
          title="Armonización — un acorde sobre cada grado"
          hint={`Apilando notas de la escala de tres en tres. Estos son los acordes que pertenecen a ${scale.name}: una canción construida con ellos se puede puntear entera con esta escala.`}
        >
          <View style={styles.grid}>
            {harmonized.map((h) => (
              <View key={h.note.index} style={styles.gridCol}>
                <AppText variant="caption" align="center" weight="600">
                  {h.note.degree} · {h.note.name}
                </AppText>
                {h.triad ? (
                  <ChordCell chord={h.triad} />
                ) : (
                  <View style={[styles.cell, { borderColor: t.borderStrong, borderStyle: "dashed" }]}>
                    <AppText variant="caption" align="center">
                      {h.triadNotes.join("-")}
                      {"\n"}sin nombre estándar
                    </AppText>
                  </View>
                )}
                {h.seventh && <ChordCell chord={h.seventh} subtitle="con séptima" />}
              </View>
            ))}
          </View>
        </Section>
      ) : (
        <Card>
          <AppText variant="label">Armonización</AppText>
          <AppText variant="muted" style={{ marginTop: 4 }}>
            {scale.formula.name} tiene {scale.notes.length} notas: apilar terceras no da acordes reconocibles. Mirá abajo qué
            acordes entran enteros en la escala — esa es la lista útil para esta escala.
          </AppText>
        </Card>
      )}

      <Section
        title={`Los ${totalChords} acordes que entran enteros en la escala`}
        hint={`Todo acorde cuyas notas están todas en ${scale.name}. Es la respuesta a "¿sobre qué acordes puedo tocar esto?".`}
      >
        <View style={{ gap: 8 }}>
          {groups.map((group) => (
            <Card key={group.note.index} padding={space.md}>
              <View style={styles.groupHead}>
                <Badge label={group.note.degree} mono />
                <AppText weight="600">{group.note.name}</AppText>
                <AppText variant="caption">{group.chords.length} acordes</AppText>
                <View style={{ flex: 1 }} />
                {group.chords.length > 0 && (
                  <Button
                    title="diagramas"
                    icon={openDegree === group.note.index ? "chevron-up" : "chevron-down"}
                    variant="ghost"
                    size="sm"
                    onPress={() => setOpenDegree(openDegree === group.note.index ? null : group.note.index)}
                  />
                )}
              </View>
              {group.chords.length === 0 && (
                <AppText variant="caption" style={{ marginTop: 4 }}>
                  Ningún acorde completo arranca en esta nota: es una nota de paso, se toca yendo hacia otra.
                </AppText>
              )}
              <ChipRow style={{ marginTop: 8 }}>
                {group.chords.map((chord) => (
                  <Chip
                    key={chord.symbol}
                    label={chord.symbol}
                    size="sm"
                    onPress={() => {
                      const voicing = bestVoicing(chord.chord);
                      if (voicing) {
                        tapFeedback();
                        playChord(voicing.midiNotes);
                      }
                    }}
                  />
                ))}
              </ChipRow>
              {openDegree === group.note.index && (
                <View style={[styles.grid, { marginTop: 10 }]}>
                  {group.chords.map((chord) => (
                    <View key={chord.symbol} style={styles.gridCol}>
                      <ChordCell chord={chord} />
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ))}
        </View>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { borderRadius: radius.md, borderWidth: 1, padding: 8, alignItems: "center", gap: 2 },
  cellHead: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", alignItems: "baseline", gap: 4 },
  homeRow: { flexDirection: "row", gap: space.md, alignItems: "flex-start", marginTop: space.sm },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridCol: { width: "31%", flexGrow: 1, gap: 6 },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 8 },
});
