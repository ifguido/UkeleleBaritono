import { describe, expect, it } from "vitest";
import { FORMULAS } from "@/lib/engine/chords";
import { SCALES, SCALE_IDS } from "@/lib/engine/scales";
import { parseNoteName } from "@/lib/engine/notes";
import {
  NOTES,
  QUALITIES,
  SCALE_SLUGS,
  allChordSlugs,
  allScaleSlugs,
  parseChordSlug,
  parseScaleSlug,
} from "../slugs";

/**
 * Las URLs de acordes y escalas son la superficie indexable del sitio. Un slug
 * duplicado o que no resuelve es una página que Google descarta, así que la
 * tabla se valida entera en vez de confiar en la revisión a ojo.
 */

describe("tabla de notas", () => {
  it("cubre las doce pitch classes sin repetir", () => {
    expect(new Set(NOTES.map((n) => n.pc)).size).toBe(12);
  });

  it("usa nombres que el motor sabe parsear, y en la altura correcta", () => {
    for (const note of NOTES) {
      expect(parseNoteName(note.engine), note.engine).toBe(note.pc);
    }
  });

  it("no repite ninguna grafía entre canónicas y alias", () => {
    const all = NOTES.flatMap((n) => [n.slug, ...n.aliases]);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("cobertura del motor", () => {
  it("da un slug a cada cualidad de acorde", () => {
    expect(QUALITIES.map((q) => q.id).sort()).toEqual(Object.keys(FORMULAS).sort());
  });

  it("da un slug a cada escala", () => {
    expect(SCALE_SLUGS.map((s) => s.id).sort()).toEqual([...SCALE_IDS].sort());
  });

  it("no repite slugs de cualidad ni de escala", () => {
    const q = QUALITIES.map((x) => x.slug);
    const s = SCALE_SLUGS.map((x) => x.slug);
    expect(new Set(q).size).toBe(q.length);
    expect(new Set(s).size).toBe(s.length);
  });
});

describe("slugs de acorde", () => {
  const slugs = allChordSlugs();

  it("genera 420 URLs únicas", () => {
    expect(slugs).toHaveLength(12 * Object.keys(FORMULAS).length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("hace ida y vuelta: cada slug canónico se parsea a sí mismo", () => {
    for (const slug of slugs) {
      const parsed = parseChordSlug(slug);
      expect(parsed, slug).not.toBeNull();
      expect(parsed!.canonical, slug).toBe(slug);
      expect(FORMULAS[parsed!.quality.id], slug).toBeDefined();
    }
  });

  it("resuelve los enarmónicos al canónico en vez de duplicar la página", () => {
    expect(parseChordSlug("re-bemol-mayor")?.canonical).toBe("do-sostenido-mayor");
    expect(parseChordSlug("sol-sostenido-m7")?.canonical).toBe("la-bemol-m7");
    expect(parseChordSlug("la-sostenido-7")?.canonical).toBe("si-bemol-7");
  });

  it("acepta los alias de cualidad y los normaliza", () => {
    expect(parseChordSlug("do-m")?.canonical).toBe("do-menor");
    expect(parseChordSlug("fa-sostenido-min7")?.canonical).toBe("fa-sostenido-m7");
    expect(parseChordSlug("mi-bemol-5")?.canonical).toBe("mi-bemol-power-chord");
  });

  it("rechaza lo que no es un acorde", () => {
    expect(parseChordSlug("do")).toBeNull();
    expect(parseChordSlug("do-inventado")).toBeNull();
    expect(parseChordSlug("h-mayor")).toBeNull();
    expect(parseChordSlug("")).toBeNull();
  });
});

describe("slugs de escala", () => {
  const slugs = allScaleSlugs();

  it("genera 432 URLs únicas", () => {
    expect(slugs).toHaveLength(12 * SCALE_IDS.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("hace ida y vuelta: cada slug canónico se parsea a sí mismo", () => {
    for (const slug of slugs) {
      const parsed = parseScaleSlug(slug);
      expect(parsed, slug).not.toBeNull();
      expect(parsed!.canonical, slug).toBe(slug);
      expect(SCALES[parsed!.scale.id], slug).toBeDefined();
    }
  });

  it("reserva la URL más buscada para la escala más buscada", () => {
    expect(parseScaleSlug("do-mayor")?.scale.id).toBe("major");
    expect(parseScaleSlug("la-menor")?.scale.id).toBe("aeolian");
    expect(parseScaleSlug("mi-blues")?.scale.id).toBe("bluesMinor");
  });

  it("normaliza alias de escala", () => {
    expect(parseScaleSlug("do-jonico")?.canonical).toBe("do-mayor");
    expect(parseScaleSlug("la-menor-natural")?.canonical).toBe("la-menor");
    expect(parseScaleSlug("re-bemol-lidio-b7")?.canonical).toBe("do-sostenido-lidio-dominante");
  });
});
