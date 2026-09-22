import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, IconButton, Section } from "@/ui";
import { SavedSong } from "./storage";

interface Props {
  songs: SavedSong[];
  onLoad: (song: SavedSong) => void;
  onDelete: (song: SavedSong) => void;
}

export function SavedSongs({ songs, onLoad, onDelete }: Props) {
  const t = useTheme();
  if (songs.length === 0) return null;
  return (
    <Section title="Canciones guardadas">
      <View style={[styles.list, { backgroundColor: t.card, borderColor: t.border }]}>
        {songs.map((s, i) => (
          <Pressable
            key={s.id}
            onPress={() => onLoad(s)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${s.name}`}
            style={({ pressed }) => [
              styles.row,
              { borderTopColor: t.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="musical-note" size={18} color={t.accent} />
            <View style={{ flex: 1 }}>
              <AppText variant="subheading" color={t.accent}>
                {s.name}
              </AppText>
              <AppText variant="caption">{new Date(s.savedAt).toLocaleDateString()}</AppText>
            </View>
            <IconButton icon="trash-outline" label={`Eliminar ${s.name}`} size={16} onPress={() => onDelete(s)} />
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
});
