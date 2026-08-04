import { describe, expect, it } from "vitest";
import { buildChordPage, chordSymbol, everyChordRoute } from "../chord-page";

/**
 * Estas 420 rutas se prerenderizan en el build. Si una sola no arma un cifrado
 * que el parser entienda, el build entero se cae; y si arma uno que el parser
 * lee como otra cualidad, se publica una página que dice una cosa y muestra
 * otra. Se comprueban todas.
 */
describe("páginas de acorde", () => {
  const routes = everyChordRoute();

  it("cubre las 420 combinaciones", () => {
    expect(routes).toHaveLength(420);
  });

  it("arma un cifrado que el motor vuelve a leer como la misma cualidad", () => {
    for (const route of routes) {
      const data = buildChordPage(route);
      expect(data, chordSymbol(route)).not.toBeNull();
      expect(data!.chord.quality, chordSymbol(route)).toBe(route.quality.id);
      expect(data!.chord.root, chordSymbol(route)).toBe(route.note.pc);
    }
  });

  it("encuentra al menos una posición tocable para cada acorde", () => {
    const vacios = routes
      .map((route) => ({ route, data: buildChordPage(route)! }))
      .filter(({ data }) => data.voicings.length === 0)
      .map(({ route }) => chordSymbol(route));

    expect(vacios).toEqual([]);
  });

  it("lista las notas del acorde con su grado", () => {
    const doMayor = routes.find((r) => r.canonical === "do-mayor")!;
    expect(buildChordPage(doMayor)!.tones).toEqual([
      { note: "C", degree: "1" },
      { note: "E", degree: "3" },
      { note: "G", degree: "5" },
    ]);
  });
});
