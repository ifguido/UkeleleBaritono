import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { space } from "@/theme/tokens";
import { AppText } from "./Text";

interface Props {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Bloque con encabezado en versalitas, como los de la web. */
export function Section({ title, hint, right, children, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <AppText variant="label">{title}</AppText>
          {hint && (
            <AppText variant="muted" style={{ marginTop: 2 }}>
              {hint}
            </AppText>
          )}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
});
