import RNSlider from "@react-native-community/slider";
import { StyleSheet, View } from "react-native";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/useTheme";
import { AppText } from "./Text";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Texto del valor a la derecha ("90 BPM"). */
  display: string;
}

/** Deslizador con etiqueta y valor: tempo, referencia de afinación. */
export function Slider({ label, value, min, max, step = 1, onChange, display }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <AppText variant="muted">{label}</AppText>
        <AppText style={{ fontFamily: fonts.mono, fontSize: 13, color: t.text }}>{display}</AppText>
      </View>
      <RNSlider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={t.accent}
        maximumTrackTintColor={t.borderStrong}
        thumbTintColor={t.accent}
        accessibilityLabel={label}
        style={styles.slider}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  slider: { width: "100%", height: 36 },
});
