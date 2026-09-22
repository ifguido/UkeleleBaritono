import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { BARITONE, PC_NAMES_FLAT, PC_NAMES_SHARP } from "@core/engine/notes";
import { ScalePosition, fretboardNotes, generatePositions, threeNotesPerString } from "@core/engine/scale-fretboard";
import { chordsInScale } from "@core/engine/scale-harmony";
import { FAMILY_LABELS, Scale, ScaleFamily, buildScale, parseScaleQuery, parentRootOf, relatedScales, scalesByFamily } from "@core/engine/scales";
import { PlaybackHandle, playMelody, preloadAudio } from "@/audio/synth";
import { FretboardDiagram, fretKey } from "@/diagrams/FretboardDiagram";
import { ScaleBoxDiagram } from "@/diagrams/ScaleBoxDiagram";
import { TabStaff } from "@/diagrams/TabStaff";
import { ScaleChords } from "@/features/scales/ScaleChords";
import { ScalePractice } from "@/features/scales/ScalePractice";
import { ScaleProgressions } from "@/features/scales/ScaleProgressions";
import { selectionFeedback } from "@/lib/haptics";
import { space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Badge, Button, Card, Chip, ChipRow, Field, Notice, Screen, Segmented } from "@/ui";

const TABS = [
  { id: "diapason", label: "Diapasón" },
  { id: "puntear", label: "Puntear" },
  { id: "acordes", label: "Acordes" },
  { id: "progresiones", label: "Progresiones" },
  { id: "variaciones", label: "Variaciones" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const MAX_FRET = 15;
const FAMILY_GROUPS = scalesByFamily();

/** Altura más grave del mástil donde cae la tónica. */
function tonicMidi(scale: Scale): number {
  const lowest = BARITONE.strings[0];
  for (let midi = lowest; midi < lowest + 12; midi++) {
    if (((midi % 12) + 12) % 12 === scale.root) return midi;
  }
  return lowest;
}

export default function ScalesScreen() {
  const t = useTheme();
  const [rootName, setRootName] = useState("A");
  const [scaleId, setScaleId] = useState("bluesMinor");
  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("diapason");
  const [labelMode, setLabelMode] = useState<"degree" | "note">("degree");
  const [useSharps, setUseSharps] = useState(false);
  const [positionKind, setPositionKind] = useState<"cajas" | "tres">("cajas");
  const [positionIndex, setPositionIndex] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showOnlyBox, setShowOnlyBox] = useState(true);
  const playRef = useRef<PlaybackHandle | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    preloadAudio();
    return () => playRef.current?.cancel();
  }, []);

  const scale = useMemo(() => buildScale(rootName, scaleId) ?? buildScale("C", "major")!, [rootName, scaleId]);
  const family: ScaleFamily = scale.formula.family;

  const notes = useMemo(() => fretboardNotes(scale, BARITONE, MAX_FRET), [scale]);
  const boxes = useMemo(() => generatePositions(scale, { maxFret: MAX_FRET }), [scale]);
  const threeNps = useMemo(() => threeNotesPerString(scale, { maxFret: MAX_FRET }), [scale]);

  const kind = positionKind === "tres" && threeNps.length === 0 ? "cajas" : positionKind;
  const positions: ScalePosition[] = kind === "cajas" ? boxes : threeNps;
  const position: ScalePosition | null = positions[Math.min(positionIndex, positions.length - 1)] ?? null;

  const stop = () => {
    playRef.current?.cancel();
    playRef.current = null;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
    setActiveKey(null);
  };

  const selectScale = (root: string, id: string) => {
    selectionFeedback();
    stop();
    setRootName(root);
    setScaleId(id);
    setQuery("");
    setQueryError(null);
    setPositionIndex(0);
  };

  const playMidis = (midis: number[], keys: (string | null)[], noteMs = 260) => {
    stop();
    playRef.current = playMelody(midis, noteMs, (i) => setActiveKey(keys[i] ?? null));
    stopTimer.current = setTimeout(stop, midis.length * noteMs + 700);
  };

  const playOneOctave = () => {
    const base = tonicMidi(scale);
    const midis = [...scale.notes.map((n) => base + n.semitones), base + 12];
    playMidis(midis, midis.map(() => null), 280);
  };

  const playPosition = (descending = false) => {
    if (!position) return;
    const path = descending ? [...position.path].reverse() : position.path;
    playMidis(path.map((n) => n.midi), path.map(fretKey), 240);
  };

  const applyQuery = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setQueryError(null);
      return;
    }
    const result = parseScaleQuery(text);
    if (result.ok && result.scale) {
      stop();
      setRootName(result.scale.rootName);
      setScaleId(result.scale.formula.id);
      setPositionIndex(0);
      setQueryError(null);
    } else {
      setQueryError(result.message ?? null);
    }
  };

  const related = useMemo(() => relatedScales(scale), [scale]);
  const parent = useMemo(() => parentRootOf(scale), [scale]);
  const chordCount = useMemo(() => chordsInScale(scale).reduce((total, group) => total + group.chords.length, 0), [scale]);
  const highlight = useMemo(
    () => ((tab === "diapason" && !showOnlyBox) || !position ? null : new Set(position.path.map(fretKey))),
    [tab, showOnlyBox, position],
  );
  const tonicNames = useSharps ? PC_NAMES_SHARP : PC_NAMES_FLAT;

  return (
    <Screen>
      <AppText variant="muted">
        Cualquier escala sobre el mástil del barítono: dónde está cada nota, cómo puntearla, qué acordes salen de ella y
        cómo variarla. Todo calculado desde los intervalos.
      </AppText>

      {/* Selector */}
      <Card padding={space.md} style={{ gap: space.sm }}>
        <Field value={query} onChangeText={applyQuery} placeholder="A blues, Do menor armónica, F# lidio…" returnKeyType="done" />
        {queryError && <AppText variant="caption" color={t.dangerText}>{queryError}</AppText>}

        <ChipRow scroll>
          {FAMILY_GROUPS.map((group) => (
            <Chip
              key={group.family}
              label={group.label}
              size="sm"
              active={family === group.family}
              onPress={() => selectScale(rootName, group.scales[0].id)}
            />
          ))}
        </ChipRow>
        <ChipRow scroll>
          {(FAMILY_GROUPS.find((g) => g.family === family)?.scales ?? []).map((formula) => (
            <Chip key={formula.id} label={formula.name} size="sm" solid active={scaleId === formula.id} onPress={() => selectScale(rootName, formula.id)} />
          ))}
        </ChipRow>

        <View style={styles.rowBetween}>
          <AppText variant="label">Tónica</AppText>
          <Chip
            label={useSharps ? "♯ sostenidos" : "♭ bemoles"}
            size="sm"
            onPress={() => {
              const next = !useSharps;
              setUseSharps(next);
              setRootName(next ? PC_NAMES_SHARP[scale.root] : PC_NAMES_FLAT[scale.root]);
            }}
          />
        </View>
        <ChipRow>
          {tonicNames.map((name, pc) => (
            <Chip key={pc} label={name} mono size="sm" minWidth={40} solid active={scale.root === pc} onPress={() => selectScale(name, scaleId)} />
          ))}
        </ChipRow>
      </Card>

      {/* Ficha de la escala */}
      <Card>
        <View style={styles.titleRow}>
          <AppText variant="heading">
            {scale.rootName} {scale.formula.name}
          </AppText>
          <Badge label={FAMILY_LABELS[scale.formula.family]} />
          <AppText variant="caption">{scale.notes.length} notas</AppText>
        </View>

        <ChipRow style={{ marginTop: space.md }}>
          {scale.notes.map((note) => (
            <View
              key={note.index}
              style={[
                styles.noteBox,
                {
                  borderColor: note.index === 0 ? t.accent : t.border,
                  backgroundColor: note.index === 0 ? t.accentSoft : t.cardAlt,
                },
              ]}
            >
              <AppText weight="600" style={{ fontSize: 15, color: note.index === 0 ? t.accentStrong : t.text }}>
                {note.name}
              </AppText>
              <AppText variant="monoSmall">{note.degree}</AppText>
            </View>
          ))}
        </ChipRow>

        <View style={{ gap: 4, marginTop: space.md }}>
          <AppText variant="muted">
            <AppText variant="caption">Fórmula  </AppText>
            <AppText variant="mono">{scale.notes.map((n) => n.degree).join(" ")}</AppText>
          </AppText>
          <AppText variant="muted">
            <AppText variant="caption">Suena  </AppText>
            {scale.formula.character}
          </AppText>
          <AppText variant="muted">
            <AppText variant="caption">Se usa  </AppText>
            {scale.formula.usage}
          </AppText>
          {parent && (
            <AppText variant="muted">
              <AppText variant="caption">Es  </AppText>
              el {scale.formula.mode!.degree}º modo de{" "}
              <AppText weight="600" style={{ fontSize: 14 }}>
                {parent.rootName} {parent.formula.name.toLowerCase()}
              </AppText>{" "}
              — mismas notas, otro centro.
            </AppText>
          )}
        </View>

        <Button title="Escuchar una octava" icon="play" variant="secondary" size="sm" onPress={playOneOctave} style={{ marginTop: space.md }} />

        {related.length > 0 && (
          <View style={{ marginTop: space.md, gap: 6 }}>
            <AppText variant="label">Escalas hermanas</AppText>
            <ChipRow>
              {related.map((rel) => (
                <Chip
                  key={`${rel.rootName}-${rel.formula.id}`}
                  label={`${rel.rootName} ${rel.formula.name}`}
                  size="sm"
                  active={rel.kind === "padre"}
                  onPress={() => selectScale(rel.rootName, rel.formula.id)}
                />
              ))}
            </ChipRow>
          </View>
        )}
      </Card>

      {/* Pestañas */}
      <ChipRow scroll>
        {TABS.map((tb) => (
          <Chip
            key={tb.id}
            label={tb.id === "acordes" ? `${tb.label} · ${chordCount}` : tb.label}
            solid
            active={tab === tb.id}
            onPress={() => setTab(tb.id)}
          />
        ))}
      </ChipRow>

      {tab === "diapason" && (
        <View style={{ gap: space.md }}>
          <View style={styles.rowBetween}>
            <Segmented
              value={labelMode}
              onChange={setLabelMode}
              options={[
                { value: "degree", label: "Grados" },
                { value: "note", label: "Notas" },
              ]}
            />
            {position && (
              <View style={styles.switchRow}>
                <AppText variant="muted">Resaltar {position.label.split(" · ")[0].toLowerCase()}</AppText>
                <Switch value={showOnlyBox} onValueChange={setShowOnlyBox} trackColor={{ true: t.accent }} />
              </View>
            )}
          </View>
          <Card padding={space.sm}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <FretboardDiagram
                notes={notes}
                maxFret={MAX_FRET}
                labelMode={labelMode}
                highlight={highlight}
                active={activeKey}
                onNoteClick={(note) => playMidis([note.midi], [fretKey(note)], 500)}
              />
            </ScrollView>
          </Card>
          <AppText variant="caption">
            Los puntos de color son la tónica: donde la frase “llega a casa”. Tocá cualquier punto para escucharlo; el mismo dibujo se
            repite doce trastes más arriba. Deslizá para ver el resto del mástil.
          </AppText>
        </View>
      )}

      {tab === "puntear" && (
        <View style={{ gap: space.md }}>
          <Segmented
            value={kind}
            onChange={(k) => {
              setPositionKind(k);
              setPositionIndex(0);
            }}
            options={[
              { value: "cajas", label: `Cajas (${boxes.length})` },
              { value: "tres", label: `3 por cuerda (${threeNps.length})`, disabled: threeNps.length === 0 },
            ]}
          />
          <AppText variant="muted">
            {kind === "cajas"
              ? "Una caja por cada nota de la escala en la 4ª cuerda: la mano no se mueve."
              : "Tres notas en cada cuerda: cambia de cuerda siempre en el mismo lugar del compás."}
          </AppText>
          <ChipRow scroll>
            {positions.map((p, i) => (
              <Chip key={p.id} label={p.label} size="sm" active={i === positionIndex} onPress={() => setPositionIndex(i)} />
            ))}
          </ChipRow>

          {position ? (
            <>
              <Card highlight>
                <View style={styles.boxRow}>
                  <View style={{ alignItems: "center" }}>
                    <ScaleBoxDiagram position={position} labelMode="finger" active={activeKey} />
                    <AppText variant="caption">dedos</AppText>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <ScaleBoxDiagram position={position} labelMode="degree" active={activeKey} />
                    <AppText variant="caption">grados</AppText>
                  </View>
                </View>
                <View style={{ gap: 2, marginTop: space.md }}>
                  <AppText variant="subheading">{position.label}</AppText>
                  <AppText variant="muted">
                    {position.noteCount} notas · {position.rootCount} {position.rootCount === 1 ? "tónica" : "tónicas"} · abarca{" "}
                    {(position.range / 12).toFixed(1)} octavas
                  </AppText>
                  <AppText variant="muted">
                    Apertura de {position.span} trastes{position.stretch && " — hay que estirar"}
                    {position.usesOpen && " · usa cuerdas al aire"}
                  </AppText>
                  <AppText variant="muted">
                    Empieza en el grado <AppText variant="mono">{position.startDegree}</AppText>
                  </AppText>
                </View>
                <View style={styles.actions}>
                  <Button title="Subir" icon="arrow-up" size="sm" onPress={() => playPosition(false)} />
                  <Button title="Bajar" icon="arrow-down" size="sm" variant="secondary" onPress={() => playPosition(true)} />
                  <Button title="Parar" icon="stop" size="sm" variant="subtle" onPress={stop} />
                </View>
              </Card>

              <Card padding={space.md}>
                <AppText variant="label" style={{ marginBottom: 4 }}>
                  La caja en tablatura, de la nota más grave a la más aguda
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TabStaff
                    notes={position.path}
                    activeIndex={activeKey ? position.path.findIndex((n) => fretKey(n) === activeKey) : null}
                    grouping={4}
                    footer="degree"
                    onNoteClick={(i) => playMidis([position.path[i].midi], [fretKey(position.path[i])], 500)}
                  />
                </ScrollView>
              </Card>

              <Card padding={space.md}>
                <AppText variant="label" style={{ marginBottom: 4 }}>
                  Dónde cae en el mástil
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <FretboardDiagram
                    notes={notes}
                    maxFret={MAX_FRET}
                    labelMode="degree"
                    highlight={new Set(position.path.map(fretKey))}
                    active={activeKey}
                    onNoteClick={(note) => playMidis([note.midi], [fretKey(note)], 500)}
                  />
                </ScrollView>
              </Card>
            </>
          ) : (
            <Notice kind="warn" message="No encontré posiciones cómodas para esta escala en el barítono." />
          )}
        </View>
      )}

      {tab === "acordes" && <ScaleChords scale={scale} />}
      {tab === "progresiones" && <ScaleProgressions scale={scale} />}
      {tab === "variaciones" &&
        (position ? (
          <ScalePractice scale={scale} position={position} onActiveNote={setActiveKey} />
        ) : (
          <AppText variant="muted">Elegí primero una caja en la pestaña Puntear.</AppText>
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  noteBox: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, alignItems: "center", minWidth: 44 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  boxRow: { flexDirection: "row", gap: space.lg, justifyContent: "center", flexWrap: "wrap" },
  actions: { flexDirection: "row", gap: 8, marginTop: space.md, flexWrap: "wrap" },
});
