import { describe, expect, it } from "vitest";
import { MAX_DESCRIPTION, fitDescription, pageMetadata } from "../metadata";
import { absoluteUrl } from "../site";
import { buildChordPage, everyChordRoute } from "../chord-page";
import { buildScalePage, everyScaleRoute } from "../scale-page";

describe("fitDescription", () => {
  it("añade los complementos que caben y descarta el resto", () => {
    const text = fitDescription("Base.", "Corto.", "x".repeat(200), "También corto.");
    expect(text).toBe("Base. Corto. También corto.");
  });

  it("no parte palabras cuando ni lo esencial entra", () => {
    const text = fitDescription("palabra ".repeat(40).trim());
    expect(text.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(text.endsWith("…")).toBe(true);
    expect(text).not.toMatch(/\s…$/);
  });

  it("deja intacto lo que ya cabe", () => {
    expect(fitDescription("Una descripción corta.")).toBe("Una descripción corta.");
  });
});

describe("canonical", () => {
  // Next normaliza el canonical con trailingSlash:false y quita la barra de la
  // raíz haga lo que haga este módulo. Se emite igual en todas partes para que
  // canonical, og:url, sitemap y JSON-LD digan exactamente lo mismo.
  it("emite la raíz sin barra final, igual que el canonical de Next", () => {
    expect(absoluteUrl("/")).toBe("https://ukelelebaritone.com");
  });

  it("no añade barra final en el resto de rutas", () => {
    expect(absoluteUrl("/acordes")).not.toMatch(/\/$/);
  });

  it("emite siempre un canonical absoluto", () => {
    const meta = pageMetadata({ title: "T", description: "D", path: "/acordes" });
    expect(meta.alternates?.canonical).toBe("https://ukelelebaritone.com/acordes");
  });
});

/**
 * Las descripciones de acorde y escala se generan a partir de los datos, así
 * que su largo depende del caso: una cromática lista doce notas con dobles
 * bemoles y se dispara. Se comprueban las 852 en vez de fiarse de una muestra.
 */
describe("largo de las descripciones generadas", () => {
  it("ninguna página de acorde se pasa del límite", () => {
    const largas = everyChordRoute()
      .map((route) => {
        const data = buildChordPage(route)!;
        const notes = data.tones.map((t) => t.note).join("–");
        return {
          slug: route.canonical,
          text: fitDescription(
            `Cómo tocar ${data.symbol} en ukelele barítono (D–G–B–E): ${data.voicings.length} posiciones con diagrama.`,
            `Notas del acorde: ${notes}.`,
            "Pulsá cualquiera para escucharla.",
          ),
        };
      })
      .filter((d) => d.text.length > MAX_DESCRIPTION);

    expect(largas).toEqual([]);
  });

  it("ninguna página de escala se pasa del límite", () => {
    const largas = everyScaleRoute()
      .map((route) => {
        const data = buildScalePage(route)!;
        const notes = data.scale.notes.map((n) => n.name).join("–");
        return {
          slug: route.canonical,
          text: fitDescription(
            `${data.spanishName} en ukelele barítono (D–G–B–E).`,
            `Notas ${notes}.`,
            "Digitaciones, acordes de la escala y progresiones para practicarla.",
          ),
        };
      })
      .filter((d) => d.text.length > MAX_DESCRIPTION);

    expect(largas).toEqual([]);
  });
});
