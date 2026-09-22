import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTheme } from "@/theme/useTheme";

/**
 * Pestañas nativas: en iOS 26 son la barra de cristal del sistema y en
 * Android la barra Material. Un ícono SF Symbol y uno Material por pestaña.
 */
export default function TabsLayout() {
  const t = useTheme();
  return (
    <NativeTabs
      tintColor={t.accent}
      iconColor={{ default: t.textFaint, selected: t.accent }}
      labelStyle={{ default: { color: t.textFaint }, selected: { color: t.accent } }}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="cancion">
        <NativeTabs.Trigger.Label>Canción</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "music.note.list", selected: "music.note.list" }} md={{ default: "queue_music", selected: "queue_music" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="acordes">
        <NativeTabs.Trigger.Label>Acordes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "guitars", selected: "guitars.fill" }} md={{ default: "music_note", selected: "music_note" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="escalas">
        <NativeTabs.Trigger.Label>Escalas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "circle.grid.3x3", selected: "circle.grid.3x3.fill" }} md={{ default: "grid_on", selected: "grid_on" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="afinador">
        <NativeTabs.Trigger.Label>Afinador</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "tuningfork", selected: "tuningfork" }} md={{ default: "graphic_eq", selected: "graphic_eq" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
