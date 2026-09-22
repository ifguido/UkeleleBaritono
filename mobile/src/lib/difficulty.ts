/** Etiqueta de dificultad de una digitación (misma escala que la web). */
export function difficultyLabel(d: number): { text: string; tone: "success" | "warn" | "danger" } {
  if (d <= 1.6) return { text: "fácil", tone: "success" };
  if (d <= 3.2) return { text: "media", tone: "warn" };
  return { text: "difícil", tone: "danger" };
}
