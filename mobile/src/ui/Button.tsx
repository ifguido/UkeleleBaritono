import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText } from "./Text";

export type IoniconName = ComponentProps<typeof Ionicons>["name"];

type Variant = "primary" | "secondary" | "subtle" | "ghost" | "danger" | "playing";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: IoniconName;
  disabled?: boolean;
  /** Ocupa todo el ancho disponible. */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  block,
  style,
  accessibilityLabel,
}: Props) {
  const t = useTheme();
  const palette = (() => {
    switch (variant) {
      case "primary":
        return { bg: t.primaryBg, fg: t.primaryText, border: t.primaryBg };
      case "secondary":
        return { bg: "transparent", fg: t.accent, border: t.accent };
      case "subtle":
        return { bg: t.card, fg: t.textMuted, border: t.borderStrong };
      case "danger":
        return { bg: t.dangerBg, fg: t.dangerText, border: t.dangerBorder };
      case "playing":
        return { bg: t.playing, fg: t.playingText, border: t.playing };
      default:
        return { bg: "transparent", fg: t.accent, border: "transparent" };
    }
  })();
  const dims =
    size === "sm"
      ? { padV: 6, padH: 10, font: 13, icon: 14, gap: 4 }
      : size === "lg"
        ? { padV: 14, padH: 20, font: 17, icon: 20, gap: 8 }
        : { padV: 10, padH: 14, font: 15, icon: 17, gap: 6 };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={size === "sm" ? 6 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingVertical: dims.padV,
          paddingHorizontal: dims.padH,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
          alignSelf: block ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      <View style={[styles.row, { gap: dims.gap }]}>
        {icon && <Ionicons name={icon} size={dims.icon} color={palette.fg} />}
        <AppText style={{ fontSize: dims.font, fontWeight: "600", color: palette.fg }}>
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IoniconName;
  onPress?: () => void;
  label: string;
  size?: number;
  color?: string;
  active?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Botón cuadrado con solo un ícono. Siempre lleva etiqueta accesible. */
export function IconButton({ icon, onPress, label, size = 20, color, active, disabled, style }: IconButtonProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: active ? t.accentSoft : "transparent",
          borderColor: active ? t.accentBorder : t.borderStrong,
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? (active ? t.accent : t.textMuted)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
