/**
 * Etiqueta de dificultad de una digitación.
 *
 * Está acá y no en `VoicingCard` porque las páginas de acorde la necesitan
 * desde el servidor, y todo lo que se exporta desde un módulo `"use client"`
 * cruza la frontera de cliente aunque sea una función pura.
 */
export function difficultyLabel(d: number): { text: string; className: string } {
  if (d <= 1.6) return { text: "fácil", className: "bg-emerald-100 text-emerald-800" };
  if (d <= 3.2) return { text: "media", className: "bg-amber-100 text-amber-800" };
  return { text: "difícil", className: "bg-rose-100 text-rose-800" };
}
