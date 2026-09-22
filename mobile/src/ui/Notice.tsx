import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText } from "./Text";

interface Props {
  kind?: "info" | "warn" | "danger" | "success";
  title?: string;
  children?: React.ReactNode;
  /** Texto simple; si hay `children`, se ignora. */
  message?: string;
  style?: StyleProp<ViewStyle>;
}

/** Aviso en línea: errores del parser, permisos, acordes que no entendí. */
export function Notice({ kind = "info", title, message, children, style }: Props) {
  const t = useTheme();
  const c =
    kind === "warn"
      ? { bg: t.warnBg, border: t.warnBorder, text: t.warnText }
      : kind === "danger"
        ? { bg: t.dangerBg, border: t.dangerBorder, text: t.dangerText }
        : kind === "success"
          ? { bg: t.successBg, border: t.successBorder, text: t.successText }
          : { bg: t.accentSoft, border: t.accentBorder, text: t.accentStrong };
  return (
    <View style={[styles.box, { backgroundColor: c.bg, borderColor: c.border }, style]}>
      {title && (
        <AppText style={{ color: c.text, fontWeight: "700", fontSize: 14, marginBottom: 2 }}>{title}</AppText>
      )}
      {children ?? <AppText style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{message}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, borderWidth: 1, padding: 12 },
});
