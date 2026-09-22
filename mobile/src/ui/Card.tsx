import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { radius, space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

interface Props {
  children: React.ReactNode;
  /** Borde de marca: el elemento seleccionado o principal. */
  highlight?: boolean;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, highlight, padding = space.lg, style }: Props) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: highlight ? (t.scheme === "dark" ? t.accentSoft : t.card) : t.card,
          borderColor: highlight ? t.accent : t.border,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1 },
});
