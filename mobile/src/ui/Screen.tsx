import { ScrollView, ScrollViewProps, StyleSheet, View } from "react-native";
import { space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

interface Props extends ScrollViewProps {
  children: React.ReactNode;
  /** Sin scroll: la pantalla maneja su propio layout (p. ej. listas). */
  fixed?: boolean;
  padded?: boolean;
}

/**
 * Contenedor de pantalla. `contentInsetAdjustmentBehavior="automatic"` es lo
 * que hace que el título grande de iOS se pliegue al hacer scroll.
 */
export function Screen({ children, fixed, padded = true, contentContainerStyle, ...rest }: Props) {
  const t = useTheme();
  if (fixed) {
    return <View style={[styles.fill, { backgroundColor: t.bg }]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: t.bg }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[padded && styles.content, contentContainerStyle]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
});
