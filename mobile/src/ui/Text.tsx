import { Text, TextProps, TextStyle } from "react-native";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/useTheme";

type Variant =
  | "title"
  | "heading"
  | "subheading"
  | "body"
  | "muted"
  | "caption"
  | "label"
  | "mono"
  | "monoSmall";

interface Props extends TextProps {
  variant?: Variant;
  /** Color explícito; por defecto lo decide la variante. */
  color?: string;
  weight?: TextStyle["fontWeight"];
  align?: TextStyle["textAlign"];
}

/**
 * Texto con las variantes tipográficas de la app. Centralizar acá el tamaño
 * y el color evita que cada pantalla invente el suyo, que es como los
 * productos terminan con doce grises distintos.
 */
export function AppText({ variant = "body", color, weight, align, style, ...rest }: Props) {
  const t = useTheme();
  const base: TextStyle = (() => {
    switch (variant) {
      case "title":
        return { fontSize: 28, fontWeight: "700", color: t.text, letterSpacing: -0.4 };
      case "heading":
        return { fontSize: 20, fontWeight: "700", color: t.text, letterSpacing: -0.2 };
      case "subheading":
        return { fontSize: 16, fontWeight: "600", color: t.text };
      case "muted":
        return { fontSize: 14, color: t.textMuted, lineHeight: 20 };
      case "caption":
        return { fontSize: 12, color: t.textFaint, lineHeight: 16 };
      case "label":
        return {
          fontSize: 11,
          fontWeight: "600",
          color: t.textFaint,
          letterSpacing: 0.8,
          textTransform: "uppercase",
        };
      case "mono":
        return { fontSize: 14, fontFamily: fonts.mono, color: t.textMuted };
      case "monoSmall":
        return { fontSize: 11, fontFamily: fonts.mono, color: t.textFaint };
      default:
        return { fontSize: 15, color: t.text, lineHeight: 21 };
    }
  })();
  return (
    <Text
      {...rest}
      style={[
        base,
        color ? { color } : null,
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
