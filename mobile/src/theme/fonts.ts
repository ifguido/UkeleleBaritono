import { Platform } from "react-native";

/**
 * Tipografías del sistema: en iOS la fuente del sistema con diseño
 * monoespaciado, en Android la monoespaciada de plataforma. La letra de las
 * canciones se alinea por columnas, así que la mono no es decorativa: sin
 * ella los acordes caen sobre la sílaba equivocada.
 */
export const fonts = {
  sans: Platform.select({ ios: "system-ui", default: undefined }),
  mono: Platform.select({ ios: "ui-monospace", default: "monospace" }),
} as const;
