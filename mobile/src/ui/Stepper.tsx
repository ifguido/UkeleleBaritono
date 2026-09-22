import { StyleSheet, View } from "react-native";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/useTheme";
import { IconButton } from "./Button";
import { AppText } from "./Text";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Cómo se muestra el valor ("2 tiempos", "12"). */
  format?: (value: number) => string;
  label: string;
}

/** Control −/+ para valores discretos. */
export function Stepper({ value, min, max, step = 1, onChange, format, label }: Props) {
  const t = useTheme();
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <View style={styles.row} accessibilityLabel={label}>
      <IconButton icon="remove" label={`Menos ${label}`} disabled={value <= min} onPress={() => onChange(round(Math.max(min, value - step)))} />
      <AppText style={{ minWidth: 72, textAlign: "center", fontFamily: fonts.mono, color: t.text, fontSize: 14 }}>
        {format ? format(value) : String(value)}
      </AppText>
      <IconButton icon="add" label={`Más ${label}`} disabled={value >= max} onPress={() => onChange(round(Math.min(max, value + step)))} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
});
