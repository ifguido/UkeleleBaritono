import { StyleProp, StyleSheet, TextInput, TextInputProps, TextStyle } from "react-native";
import { fonts } from "@/theme/fonts";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

interface Props extends TextInputProps {
  mono?: boolean;
  style?: StyleProp<TextStyle>;
}

/** Campo de texto con el estilo de la app. */
export function Field({ mono, style, multiline, ...rest }: Props) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.textFaint}
      selectionColor={t.accent}
      autoCorrect={false}
      autoCapitalize="none"
      spellCheck={false}
      keyboardAppearance={t.scheme}
      multiline={multiline}
      {...rest}
      style={[
        styles.input,
        {
          backgroundColor: t.cardAlt,
          borderColor: t.borderStrong,
          color: t.text,
          fontFamily: mono ? fonts.mono : fonts.sans,
          textAlignVertical: multiline ? "top" : "center",
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
