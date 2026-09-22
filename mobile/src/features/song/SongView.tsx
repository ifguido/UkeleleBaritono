import { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { OptimizedOccurrence } from "@core/engine/optimizer";
import { ParsedSong, SongLine } from "@core/engine/song-parser";
import { fonts } from "@/theme/fonts";
import { Theme, radius } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText } from "@/ui";
import { OccurrenceRange } from "./useSongWorkspace";

interface Props {
  song: ParsedSong;
  optimized: Map<number, OptimizedOccurrence>;
  onChordPress: (occurrenceIndex: number) => void;
  onChordLongPress: (occurrenceIndex: number) => void;
  playingIndex?: number | null;
  rangeMode?: boolean;
  range?: OccurrenceRange | null;
  selectedIndex?: number | null;
  selectedSymbol?: string | null;
  sectionRanges?: Map<number, OccurrenceRange>;
  onPlaySection?: (range: OccurrenceRange) => void;
  /** Posición vertical de cada línea dentro de la vista, para el auto-scroll. */
  onLineLayout?: (lineIndex: number, y: number) => void;
}

const FONT_SIZE = 13;
const LINE_HEIGHT = 24;

/**
 * La canción preservando el layout: líneas de acordes tocables alineadas
 * sobre la letra, en fuente monoespaciada. Las líneas largas se desplazan
 * en horizontal en vez de envolver, porque envolver rompe la alineación.
 */
export const SongView = memo(function SongView({
  song,
  optimized,
  onChordPress,
  onChordLongPress,
  playingIndex,
  rangeMode = false,
  range = null,
  selectedIndex = null,
  selectedSymbol = null,
  sectionRanges,
  onPlaySection,
  onLineLayout,
}: Props) {
  const t = useTheme();
  const inRange = (index: number) => range !== null && index >= range.start && index <= range.end;

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inner}>
        <View>
          {song.lines.map((line, i) => (
            <View key={i} onLayout={onLineLayout ? (e) => onLineLayout(i, e.nativeEvent.layout.y) : undefined}>
              <Line
                line={line}
                index={i}
                t={t}
                optimized={optimized}
                inRange={inRange}
                playingIndex={playingIndex ?? null}
                rangeMode={rangeMode}
                selectedIndex={selectedIndex}
                selectedSymbol={selectedSymbol}
                sectionRange={sectionRanges?.get(i)}
                onPlaySection={onPlaySection}
                onChordPress={onChordPress}
                onChordLongPress={onChordLongPress}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

interface LineProps {
  line: SongLine;
  index: number;
  t: Theme;
  optimized: Map<number, OptimizedOccurrence>;
  inRange: (index: number) => boolean;
  playingIndex: number | null;
  rangeMode: boolean;
  selectedIndex: number | null;
  selectedSymbol: string | null;
  sectionRange?: OccurrenceRange;
  onPlaySection?: (range: OccurrenceRange) => void;
  onChordPress: (occurrenceIndex: number) => void;
  onChordLongPress: (occurrenceIndex: number) => void;
}

function Line({
  line,
  t,
  optimized,
  inRange,
  playingIndex,
  rangeMode,
  selectedIndex,
  selectedSymbol,
  sectionRange,
  onPlaySection,
  onChordPress,
  onChordLongPress,
}: LineProps) {
  const mono = { fontFamily: fonts.mono, fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT, color: t.text };

  if (line.type === "blank") return <Text style={mono}> </Text>;

  if (line.type === "section") {
    return (
      <View style={styles.sectionRow}>
        <AppText variant="label" color={t.accent}>
          {line.name}
        </AppText>
        {sectionRange && onPlaySection && (
          <Pressable
            onPress={() => onPlaySection(sectionRange)}
            accessibilityLabel={`Escuchar ${line.name}`}
            hitSlop={8}
            style={({ pressed }) => [styles.sectionPlay, { borderColor: t.accentBorder, opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="play" size={10} color={t.accent} />
          </Pressable>
        )}
      </View>
    );
  }

  if (line.type === "lyric") return <Text style={mono}>{line.text}</Text>;

  // Línea de acordes: reconstruir con espacios para mantener columnas
  let cursor = 0;
  const parts: React.ReactNode[] = [];
  line.tokens.forEach((token, j) => {
    const pad = Math.max(token.charIndex - cursor, j === 0 ? 0 : 1);
    if (pad > 0) parts.push(<Text key={`p${j}`}>{" ".repeat(pad)}</Text>);
    cursor = Math.max(token.charIndex, cursor + pad) + token.raw.length;
    if (token.chord && token.occurrenceIndex !== undefined) {
      const idx = token.occurrenceIndex;
      const occ = optimized.get(idx);
      const isPlaying = playingIndex === idx;
      const selected = inRange(idx);
      const isSelected = selectedIndex === idx;
      const isSameSymbol = selectedSymbol !== null && token.chord.normalized === selectedSymbol;
      const look = isPlaying
        ? { bg: t.playing, fg: t.playingText }
        : selected
          ? { bg: t.accentSoft, fg: t.accentStrong }
          : isSelected
            ? { bg: t.primaryBg, fg: t.primaryText }
            : isSameSymbol
              ? { bg: t.accentSoft, fg: t.accentStrong }
              : occ?.locked
                ? { bg: t.lockedBg, fg: t.lockedText }
                : rangeMode
                  ? { bg: t.cardAlt, fg: t.accent }
                  : { bg: "transparent", fg: t.accent };
      parts.push(
        <Text
          key={j}
          onPress={() => onChordPress(idx)}
          onLongPress={() => onChordLongPress(idx)}
          accessibilityRole="button"
          accessibilityLabel={occ ? `${token.raw}, posición ${occ.voicing.display}` : token.raw}
          style={{ backgroundColor: look.bg, color: look.fg, fontWeight: "700", borderRadius: 3 }}
        >
          {token.raw}
        </Text>,
      );
    } else {
      parts.push(
        <Text
          key={j}
          style={
            token.error
              ? { color: t.dangerText, textDecorationLine: "underline", textDecorationStyle: "dotted" }
              : { color: t.textFaint }
          }
        >
          {token.raw}
        </Text>,
      );
    }
  });
  return <Text style={mono}>{parts}</Text>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1 },
  inner: { padding: 14, paddingRight: 28 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, height: LINE_HEIGHT, marginTop: 6 },
  sectionPlay: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 1,
  },
});
