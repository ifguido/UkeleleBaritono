import { describe, expect, it } from "vitest";
import { buildScalePage, everyScaleRoute } from "../scale-page";
import { chordSlug, parseChordSlug } from "../slugs";

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
      for (const degree of data.degrees) {
        for (const chord of [degree.triad, degree.seventh]) {
          if (!chord) continue;
          const slug = chordSlug(chord.chord.root, chord.chord.quality);
          expect(slug, `${route.canonical} → ${chord.symbol}`).not.toBeNull();
          expect(parseChordSlug(slug!)?.canonical, slug!).toBe(slug);
        }
      }
    }
  });
});
