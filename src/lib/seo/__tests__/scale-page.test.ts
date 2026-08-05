import { describe, expect, it } from "vitest";
import { buildScalePage, everyScaleRoute } from "../scale-page";
import { parseChordSlug } from "../slugs";

describe("páginas de escala", () => {
  const routes = everyScaleRoute();

  it("cubre las 432 combinaciones", () => {
    expect(routes).toHaveLength(432);
  });

  it("construye cada escala con la tónica correcta", () => {
    for (const route of routes) {
      const data = buildScalePage(route);
      expect(data, route.canonical).not.toBeNull();
      expect(data!.scale.root, route.canonical).toBe(route.note.pc);
      expect(data!.scale.notes.length, route.canonical).toBeGreaterThan(2);
    }
  });

  it("arma la armonización solo donde tiene sentido musical", () => {
    const mayor = routes.find((r) => r.canonical === "do-mayor")!;
    expect(buildScalePage(mayor)!.degrees).toHaveLength(7);

    // Apilar terceras en una pentatónica no da acordes: se deja vacío a propósito.
    const penta = routes.find((r) => r.canonical === "la-pentatonica-menor")!;
    expect(buildScalePage(penta)!.degrees).toHaveLength(0);
  });

  it("da acordes cuyo slug existe, para no enlazar a páginas inexistentes", () => {
    for (const route of routes) {
      const data = buildScalePage(route)!;
      const cells = [
        ...data.degrees.flatMap((d) => [d.triad, d.seventh]),
        ...data.progressions.flatMap((p) => p.chords),
      ];
      for (const cell of cells) {
        if (!cell?.slug) continue;
        expect(parseChordSlug(cell.slug)?.canonical, cell.slug).toBe(cell.slug);
      }
    }
  });

  it("da notas reproducibles en todo acorde que entre en cuatro cuerdas", () => {
    const sinSonido: string[] = [];
    for (const route of routes) {
      const data = buildScalePage(route)!;
      for (const cell of data.degrees.flatMap((d) => [d.triad, d.seventh])) {
        if (!cell) continue;
        // Puede ser null si el acorde no entra en el barítono, pero nunca vacío:
        // un array de cero notas dejaría un botón que no suena al pulsarlo.
        if (cell.midiNotes !== null && cell.midiNotes.length === 0) {
          sinSonido.push(`${route.canonical} → ${cell.symbol}`);
        }
      }
    }
    expect(sinSonido).toEqual([]);
  });

  it("reutiliza las posiciones ya calculadas en vez de rehacerlas", () => {
    // La caché es lo que mantiene el build en segundos: sin ella, las 432
    // escalas recalcularían miles de veces los mismos 420 acordes.
    const inicio = performance.now();
    routes.forEach((route) => buildScalePage(route));
    const primeraPasada = performance.now() - inicio;

    const reinicio = performance.now();
    routes.forEach((route) => buildScalePage(route));
    const segundaPasada = performance.now() - reinicio;

    expect(segundaPasada).toBeLessThan(primeraPasada);
  });
});
