import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText } from "./Text";

interface Option<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface Props<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  /** Reparte el ancho entre las opciones. */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Control segmentado: dos o tres modos excluyentes. */
export function Segmented<T extends string>({ value, options, onChange, block, style }: Props<T>) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: t.cardAlt, borderColor: t.border }, block && styles.block, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            disabled={o.disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: !!o.disabled }}
            style={({ pressed }) => [
              styles.item,
              block && styles.itemBlock,
              { backgroundColor: active ? t.primaryBg : "transparent", opacity: o.disabled ? 0.4 : pressed ? 0.75 : 1 },
            ]}
          >
            <AppText style={{ fontSize: 13, fontWeight: "600", color: active ? t.primaryText : t.textMuted }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", padding: 3, borderRadius: radius.md, borderWidth: 1, alignSelf: "flex-start" },
  block: { alignSelf: "stretch" },
  item: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, alignItems: "center" },
  itemBlock: { flex: 1 },
});
