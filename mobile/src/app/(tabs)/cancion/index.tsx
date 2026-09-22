import * as Clipboard from "expo-clipboard";
import { Stack, router } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useCallback, useEffect, useRef } from "react";
import { ScrollView, Share, StyleSheet, View } from "react-native";
import { AdvancedSettings } from "@/features/song/AdvancedSettings";
import { ChordStrip } from "@/features/song/ChordStrip";
import { ChordWorkbench } from "@/features/song/ChordWorkbench";
import { PromptSheet } from "@/features/song/PromptSheet";
import { SavedSongs } from "@/features/song/SavedSongs";
import { SongView } from "@/features/song/SongView";
import { DEMO, useSongWorkspace } from "@/features/song/useSongWorkspace";
import { difficultyLabel } from "@/lib/difficulty";
import { space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Badge, Button, Card, Field, IconButton, Notice, Section, Segmented, Slider } from "@/ui";

export default function SongScreen() {
  const t = useTheme();
  const ws = useSongWorkspace();
  const scrollRef = useRef<ScrollView | null>(null);
  const lineY = useRef<Map<number, number>>(new Map());
  const blockTop = useRef(0);
  const songViewTop = useRef(0);

  const scrollToOccurrence = useCallback(
    (index: number) => {
      const occ = ws.song?.occurrences.find((o) => o.index === index);
      if (!occ) return;
      const y = lineY.current.get(occ.lineIndex);
      if (y === undefined) return;
      scrollRef.current?.scrollTo({ y: Math.max(0, blockTop.current + songViewTop.current + y - 160), animated: true });
    },
    [ws.song],
  );

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text.trim()) ws.setInput(text);
  };

  const share = async () => {
    if (!ws.song || !ws.result) return;
    const shapes = [...ws.result.chordShapes.entries()]
      .map(([symbol, voicings]) => `${symbol}: ${voicings.map((v) => v.display).join(" / ")}`)
      .join("\n");
    const title = ws.song.title ?? "Arreglo para ukelele barítono";
    await Share.share({
      title,
      message: `${title}${ws.song.artist ? ` — ${ws.song.artist}` : ""}\n\nPosiciones (D-G-B-E):\n${shapes}\n\n${ws.input}\n\n— Ukelele Barítono`,
    });
  };

  const { result, song } = ws;

  // Contenido compartido desde otra app: una URL (Safari, Chrome, CifraClub…)
  // o el texto de una canción. Se consume una sola vez y se optimiza al toque.
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { optimizeText } = ws;
  useEffect(() => {
    if (!hasShareIntent) return;
    const shared = (shareIntent.webUrl ?? shareIntent.text ?? "").trim();
    resetShareIntent();
    if (shared) void optimizeText(shared);
  }, [hasShareIntent, shareIntent, resetShareIntent, optimizeText]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <IconButton icon="information-circle-outline" label="Acerca de la app" onPress={() => router.push("/acerca")} style={{ borderWidth: 0 }} />,
        }}
      />
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: t.bg }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickyHeaderIndices={result && song ? [1] : undefined}
        contentContainerStyle={styles.content}
      >
        {/* 0: entrada o encabezado del resultado */}
        <View style={styles.block}>
          {!result && (
            <View style={{ gap: 6 }}>
              <AppText variant="heading">Tu canción, lista para barítono</AppText>
              <AppText variant="muted">
                Pegá una canción con acordes (o una URL) y te la devuelvo con posiciones correctas, cómodas y
                verificadas nota por nota para la afinación D–G–B–E.
              </AppText>
            </View>
          )}

          {result && !ws.editorOpen ? (
            <Button
              title="Editar el texto de la canción o cambiar la URL"
              icon="create-outline"
              variant="subtle"
              size="sm"
              block
              onPress={() => ws.setEditorOpen(true)}
            />
          ) : (
            <Card padding={space.md}>
              <Field
                mono
                multiline
                value={ws.input}
                onChangeText={ws.setInput}
                placeholder={"Pegá acá tu canción o una URL…\n\nE        F#m       C#m\nAlguna letra por aquí\n\nTambién sirve una progresión suelta: E F#m C#m B7"}
                style={{ minHeight: result ? 140 : 200, fontSize: 13 }}
              />
              <View style={styles.actions}>
                <Button
                  title={ws.busy ? "Importando…" : result ? "Aplicar cambios" : "Optimizar"}
                  icon={ws.busy ? undefined : "sparkles"}
                  disabled={ws.busy || !ws.input.trim()}
                  onPress={() => void ws.handleOptimize()}
                />
                <Button title="Pegar" icon="clipboard-outline" variant="subtle" onPress={() => void pasteFromClipboard()} />
                {result ? (
                  <Button title="Cancelar" variant="ghost" onPress={() => ws.setEditorOpen(false)} />
                ) : (
                  <Button title="Probar con un ejemplo" variant="ghost" onPress={() => ws.setInput(DEMO)} />
                )}
              </View>
            </Card>
          )}
          {ws.error && <Notice kind="danger" message={ws.error} />}

          {!result && <SavedSongs songs={ws.saved} onLoad={ws.handleLoad} onDelete={ws.handleDelete} />}

          {result && song && (
            <View style={{ gap: space.md }}>
              <View>
                <AppText variant="heading">{song.title ?? "Arreglo para barítono"}</AppText>
                {song.artist && <AppText variant="muted">{song.artist}</AppText>}
                {ws.songKey && (
                  <AppText variant="muted" style={{ marginTop: 2 }}>
                    Tonalidad: <AppText weight="600" style={{ fontSize: 14, color: t.text }}>{ws.songKey.name}</AppText>
                    {ws.songKey.nonDiatonic.length > 0 && ` · fuera de la tonalidad: ${ws.songKey.nonDiatonic.join(", ")}`}
                  </AppText>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbar}>
                {ws.playingIndex === null ? (
                  <Button title="Escuchar todo" icon="play" onPress={ws.handlePlay} />
                ) : (
                  <Button title="Detener" icon="stop" variant="playing" onPress={ws.stopPlayback} />
                )}
                <Button
                  title={ws.rangeMode ? "Salir de selección" : "Escuchar una parte"}
                  icon={ws.rangeMode ? "close" : "cut-outline"}
                  variant={ws.rangeMode ? "primary" : "secondary"}
                  onPress={ws.toggleRangeMode}
                />
                <Button title="Guardar" icon="bookmark-outline" variant="subtle" onPress={ws.handleSave} />
                <Button title="Compartir" icon="share-outline" variant="subtle" onPress={() => void share()} />
                <Button title="Nueva" icon="add" variant="subtle" onPress={ws.reset} />
              </ScrollView>
            </View>
          )}
        </View>

        {/* 1: tira de acordes (fija arriba al hacer scroll) */}
        {result && song ? (
          <ChordStrip
            result={result}
            songKey={ws.songKey}
            selected={ws.selected}
            onSelect={(i) => {
              ws.selectAndPlay(i);
              scrollToOccurrence(i);
            }}
            onOpenWorkbench={ws.openWorkbench}
          />
        ) : (
          <View />
        )}

        {/* 2: cuerpo */}
        {result && song && (
          <View style={styles.block} onLayout={(e) => (blockTop.current = e.nativeEvent.layout.y)}>
            {ws.rangeMode && (
              <Notice kind="info">
                <View style={{ gap: 8 }}>
                  <AppText style={{ color: t.accentStrong }}>
                    {ws.range === null
                      ? "Tocá el primer acorde de la parte que querés escuchar."
                      : ws.range.start === ws.range.end
                        ? "Ahora tocá el último acorde de la parte (o reproducí solo ese)."
                        : `Parte seleccionada: ${ws.range.end - ws.range.start + 1} acordes.`}
                  </AppText>
                  {ws.range !== null && (
                    <View style={styles.actions}>
                      <Button title="Reproducir" icon="play" size="sm" onPress={() => ws.playRange(ws.range!)} />
                      {ws.playingIndex !== null && <Button title="Detener" icon="stop" size="sm" variant="playing" onPress={ws.stopPlayback} />}
                      <Button title="Limpiar" size="sm" variant="ghost" onPress={ws.clearRange} />
                    </View>
                  )}
                </View>
              </Notice>
            )}

            {song.errors.length > 0 && (
              <Notice kind="warn" title="Acordes que no entendí (quedaron marcados en la canción)">
                {song.errors.map((e, i) => (
                  <AppText key={i} style={{ color: t.warnText, fontSize: 13, lineHeight: 18 }}>
                    • {e}
                  </AppText>
                ))}
              </Notice>
            )}
            {result.unplayable.length > 0 && (
              <Notice kind="danger">
                {result.unplayable.map((u, i) => (
                  <AppText key={i} style={{ color: t.dangerText, fontSize: 13, lineHeight: 18 }}>
                    {u.message}
                  </AppText>
                ))}
              </Notice>
            )}

            <View onLayout={(e) => (songViewTop.current = e.nativeEvent.layout.y)}>
            <SongView
              song={song}
              optimized={ws.optimizedMap}
              onChordPress={ws.handleChordClick}
              onChordLongPress={(i) => ws.openWorkbench(i, false)}
              playingIndex={ws.playingIndex}
              rangeMode={ws.rangeMode}
              range={ws.range}
              selectedIndex={ws.selectedOcc}
              selectedSymbol={ws.selected?.occurrence.chord.normalized ?? null}
              sectionRanges={ws.sectionRanges}
              onPlaySection={ws.playRange}
              onLineLayout={(i, y) => lineY.current.set(i, y)}
            />
            </View>
            <AppText variant="caption">Tocá un acorde para escucharlo y verlo en la tira. Mantenelo pulsado para cambiar la posición.</AppText>

            <Section title="Reproducción">
              <Card padding={space.md}>
                <Slider label="Tempo" value={ws.bpm} min={40} max={180} onChange={ws.setBpm} display={`${ws.bpm} BPM`} />
                <View style={[styles.actions, { alignItems: "center", marginTop: 4 }]}>
                  <AppText variant="muted">Ritmo</AppText>
                  <Segmented
                    value={ws.rhythm}
                    onChange={ws.setRhythm}
                    options={[
                      { value: "layout", label: "Según la letra" },
                      { value: "uniform", label: "Uniforme" },
                    ]}
                  />
                </View>
                <AppText variant="caption" style={{ marginTop: 6 }}>
                  “Según la letra” estima cuánto dura cada acorde por el texto que abarca; también podés anotar E*2 en la canción.
                </AppText>
              </Card>
            </Section>

            {ws.difficultChords.length > 0 && (
              <Section title="Acordes que pueden costar más">
                <Card padding={space.md}>
                  {ws.difficultChords.map((o) => {
                    const d = difficultyLabel(o.voicing.difficulty);
                    return (
                      <View key={o.occurrence.index} style={styles.difficultRow}>
                        <AppText weight="700" color={t.accent} onPress={() => ws.openWorkbench(o.occurrence.index, false)}>
                          {o.occurrence.chord.normalized}
                        </AppText>
                        <AppText variant="mono">{o.voicing.display}</AppText>
                        <Badge label={d.text} tone={d.tone} />
                        <AppText variant="caption">{o.alternatives.length} alternativas</AppText>
                      </View>
                    );
                  })}
                </Card>
              </Section>
            )}

            <AdvancedSettings settings={ws.settings} onChange={ws.handleSettingsChange} />
          </View>
        )}
      </ScrollView>

      <ChordWorkbench
        working={ws.workbench ? (ws.optimizedMap.get(ws.workbench.index) ?? null) : null}
        songKey={ws.songKey}
        locks={ws.locks}
        result={result}
        beats={ws.workbench ? (ws.beatsByOccurrence[ws.workbench.index] ?? 1) : 1}
        startEditing={ws.workbench?.editing ?? false}
        onApply={ws.handleApply}
        onClearLocks={ws.handleClearLocks}
        onEditChord={ws.handleEditChord}
        onRevertEdit={ws.handleRevertEdit}
        onSetBeats={ws.handleSetBeats}
        onClose={ws.closeWorkbench}
      />

      <PromptSheet
        visible={ws.savePrompt !== null}
        title="Guardar canción"
        message="Nombre para encontrarla después."
        initialValue={ws.savePrompt ?? ""}
        onConfirm={ws.confirmSave}
        onCancel={ws.cancelSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl * 2 },
  block: { padding: space.lg, gap: space.lg },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" },
  toolbar: { gap: 8, paddingRight: 8 },
  difficultRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", paddingVertical: 4 },
});
