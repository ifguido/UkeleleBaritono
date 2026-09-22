import { Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { fonts } from "@/theme/fonts";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText } from "./Text";

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Estilo "sólido": fondo de marca cuando está activo (para modos). */
  solid?: boolean;
  mono?: boolean;
  /** Ancho mínimo, útil para que las doce tónicas queden parejas. */
  minWidth?: number;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

/** Píldora seleccionable: filtros, tónicas, cajas, patrones. */
export function Chip({ label, active, onPress, disabled, solid, mono, minWidth, size = "md", style }: ChipProps) {
  const t = useTheme();
  const bg = active ? (solid ? t.primaryBg : t.accentSoft) : t.card;
  const border = active ? (solid ? t.primaryBg : t.accentBorder) : t.borderStrong;
  const fg = active ? (solid ? t.primaryText : t.accent) : t.textMuted;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.chip,
        size === "sm" ? styles.chipSm : null,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1, minWidth },
        style,
      ]}
    >
      <AppText
        style={{
          fontSize: size === "sm" ? 12 : 14,
          fontWeight: active ? "600" : "500",
          color: fg,
          fontFamily: mono ? fonts.mono : undefined,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

interface ChipRowProps {
  children: React.ReactNode;
  /** Desplazable en horizontal en vez de envolver. */
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ChipRow({ children, scroll, style }: ChipRowProps) {
  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, styles.noWrap, style]}
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
  },
  chipSm: { paddingHorizontal: 9, paddingVertical: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  noWrap: { flexWrap: "nowrap" },
});
