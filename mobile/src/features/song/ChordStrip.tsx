import { useEffect, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { DetectedKey, romanNumeral } from "@core/engine/key-detect";
import { OptimizeResult, OptimizedOccurrence } from "@core/engine/optimizer";
import { Voicing } from "@core/engine/voicings";
import { ChordDiagram } from "@/diagrams/ChordDiagram";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Button } from "@/ui";

interface Props {
  result: OptimizeResult;
  songKey: DetectedKey | null;
  selected: OptimizedOccurrence | null;
  onSelect: (occurrenceIndex: number) => void;
  onOpenWorkbench: (index: number, editing: boolean) => void;
}

const CARD_W = 82;

/**
 * Tira horizontal con los acordes de la canción, en orden de aparición y
 * por cada posición usada. Queda fija arriba mientras se lee la letra:
 * tocar uno lo hace sonar y lo resalta; "Editar" abre la mesa de trabajo.
 */
export function ChordStrip({ result, songKey, selected, onSelect, onOpenWorkbench }: Props) {
  const t = useTheme();
  const scrollRef = useRef<ScrollView | null>(null);

  const cards = useMemo(
    () =>
      [...result.chordShapes.entries()].flatMap(([symbol, voicings]) =>
        voicings
          .map((v) => {
            const first = result.occurrences.find(
              (o) => o.occurrence.chord.normalized === symbol && o.voicing.display === v.display,
            );
            return first ? { symbol, voicing: v as Voicing, first } : null;
          })
          .filter((c): c is { symbol: string; voicing: Voicing; first: OptimizedOccurrence } => c !== null),
      ),
    [result],
  );

  const selectedSymbol = selected?.occurrence.chord.normalized ?? null;
  const activeIndex = cards.findIndex(
    (c) => c.symbol === selectedSymbol && selected?.voicing.display === c.voicing.display,
  );

  // Al seleccionar un acorde (desde la letra o donde sea), la tira se
  // desplaza para mostrar la tarjeta correspondiente.
  useEffect(() => {
    if (activeIndex < 0) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, activeIndex * (CARD_W + 8) - 120), animated: true });
  }, [activeIndex]);

  if (cards.length === 0) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {cards.map((c, i) => {
          const roman = songKey ? romanNumeral(c.first.occurrence.chord, songKey) : null;
          const active = i === activeIndex;
          return (
            <Pressable
              key={c.symbol + c.voicing.display}
              onPress={() => onSelect(c.first.occurrence.index)}
              accessibilityRole="button"
              accessibilityLabel={`${c.symbol}, ${c.voicing.display}`}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: active ? t.accentSoft : t.card,
                  borderColor: active ? t.accent : t.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.title}>
                <AppText style={{ fontSize: 14, fontWeight: "700", color: t.text }}>{c.symbol}</AppText>
                {roman && (
                  <AppText variant="caption" style={{ fontSize: 9 }}>
                    {roman}
                  </AppText>
                )}
              </View>
              <ChordDiagram frets={c.voicing.frets} barre={c.voicing.barre} size="sm" />
            </Pressable>
          );
        })}
      </ScrollView>

      {selected && (
        <View style={styles.actions}>
          <AppText variant="subheading">{selectedSymbol}</AppText>
          <AppText variant="mono">{selected.voicing.display}</AppText>
          <View style={{ flex: 1 }} />
          <Button
            title="Editar acorde"
            icon="create-outline"
            variant="secondary"
            size="sm"
            onPress={() => onOpenWorkbench(selected.occurrence.index, true)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { gap: 8, paddingHorizontal: 16 },
  card: {
    width: CARD_W,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 6,
  },
  title: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 8 },
});
