/**
 * Paleta de la app. Es la misma que usa la web (stone + teal de Tailwind),
 * para que quien pase de una a otra reconozca el producto, con una variante
 * oscura pensada a mano: no basta con invertir, los diagramas tienen que
 * seguir leyéndose sobre fondo negro.
 */

export interface Theme {
  scheme: "light" | "dark";
  /** Fondo de pantalla. */
  bg: string;
  /** Tarjetas y paneles. */
  card: string;
  /** Superficie secundaria dentro de una tarjeta (inputs, chips inactivos). */
  cardAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  /** Color de marca para textos, enlaces y estados activos. */
  accent: string;
  accentStrong: string;
  /** Fondo suave con tinte de marca (selección, resaltado). */
  accentSoft: string;
  accentBorder: string;
  /** Botón primario. */
  primaryBg: string;
  primaryText: string;
  /** Avisos. */
  warnBg: string;
  warnBorder: string;
  warnText: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  successBg: string;
  successBorder: string;
  successText: string;
  /** Notas omitidas/añadidas. */
  orangeText: string;
  /** Acordes prestados (fuera de la tonalidad). */
  purpleBg: string;
  purpleText: string;
  /** Lo que está sonando ahora. */
  playing: string;
  playingBorder: string;
  playingText: string;
  /** Posiciones fijadas a mano. */
  lockedBg: string;
  lockedText: string;
  /** Diagramas. */
  ink: string;
  soft: string;
  faint: string;
  tonic: string;
  tonicText: string;
  dotFill: string;
  dotText: string;
  /** Sombra de tarjetas (solo iOS la dibuja con opacidad). */
  shadow: string;
}

export const light: Theme = {
  scheme: "light",
  bg: "#fafaf9",
  card: "#ffffff",
  cardAlt: "#f5f5f4",
  border: "#e7e5e4",
  borderStrong: "#d6d3d1",
  text: "#1c1917",
  textMuted: "#57534e",
  textFaint: "#a8a29e",
  accent: "#0f766e",
  accentStrong: "#115e59",
  accentSoft: "#f0fdfa",
  accentBorder: "#99f6e4",
  primaryBg: "#0f766e",
  primaryText: "#ffffff",
  warnBg: "#fffbeb",
  warnBorder: "#fde68a",
  warnText: "#92400e",
  dangerBg: "#fff1f2",
  dangerBorder: "#fecdd3",
  dangerText: "#9f1239",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  successText: "#065f46",
  orangeText: "#c2410c",
  purpleBg: "#f3e8ff",
  purpleText: "#6b21a8",
  playing: "#f59e0b",
  playingBorder: "#b45309",
  playingText: "#1c1917",
  lockedBg: "#fef3c7",
  lockedText: "#78350f",
  ink: "#292524",
  soft: "#a8a29e",
  faint: "#e7e5e4",
  tonic: "#0f766e",
  tonicText: "#ffffff",
  dotFill: "#ffffff",
  dotText: "#1c1917",
  shadow: "#000000",
};

export const dark: Theme = {
  scheme: "dark",
  bg: "#0c0a09",
  card: "#1c1917",
  cardAlt: "#292524",
  border: "#292524",
  borderStrong: "#44403c",
  text: "#fafaf9",
  textMuted: "#a8a29e",
  textFaint: "#78716c",
  accent: "#2dd4bf",
  accentStrong: "#5eead4",
  accentSoft: "#042f2e",
  accentBorder: "#115e59",
  primaryBg: "#0d9488",
  primaryText: "#ffffff",
  warnBg: "#2a1a05",
  warnBorder: "#78350f",
  warnText: "#fcd34d",
  dangerBg: "#3b0a17",
  dangerBorder: "#881337",
  dangerText: "#fda4af",
  successBg: "#052e22",
  successBorder: "#065f46",
  successText: "#6ee7b7",
  orangeText: "#fdba74",
  purpleBg: "#2e1065",
  purpleText: "#d8b4fe",
  playing: "#f59e0b",
  playingBorder: "#fbbf24",
  playingText: "#1c1917",
  lockedBg: "#3a2a0a",
  lockedText: "#fcd34d",
  ink: "#e7e5e4",
  soft: "#78716c",
  faint: "#44403c",
  tonic: "#2dd4bf",
  tonicText: "#042f2e",
  dotFill: "#1c1917",
  dotText: "#fafaf9",
  shadow: "#000000",
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
