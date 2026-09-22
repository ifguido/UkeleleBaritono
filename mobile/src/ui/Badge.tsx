import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { AppText } from "./Text";

type Tone = "neutral" | "accent" | "warn" | "danger" | "success" | "orange" | "purple";

interface Props {
  label: string;
  tone?: Tone;
  mono?: boolean;
}

/** Etiqueta chica: dificultad, exacto/parcial, grado, cifrado. */
export function Badge({ label, tone = "neutral", mono }: Props) {
  const t = useTheme();
  const c =
    tone === "accent"
      ? { bg: t.accentSoft, fg: t.accentStrong }
      : tone === "warn"
        ? { bg: t.warnBg, fg: t.warnText }
        : tone === "danger"
          ? { bg: t.dangerBg, fg: t.dangerText }
          : tone === "success"
            ? { bg: t.successBg, fg: t.successText }
            : tone === "orange"
              ? { bg: t.warnBg, fg: t.orangeText }
              : tone === "purple"
                ? { bg: t.purpleBg, fg: t.purpleText }
                : { bg: t.cardAlt, fg: t.textMuted };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <AppText variant={mono ? "monoSmall" : "caption"} style={{ color: c.fg, fontWeight: "600" }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
});
