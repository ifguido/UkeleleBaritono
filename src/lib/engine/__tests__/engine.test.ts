import { describe, expect, it } from "vitest";
import { parseChord, parseChordFlexible, chordPitchClasses } from "../chords";
import { parseNoteName, parseNoteWithOctave, BARITONE, pcName } from "../notes";
import { validateVoicing, generateVoicings, parseFretString, Fret } from "../voicings";
import { identifyChord } from "../identify";
import { applyChordEdits, parseSong } from "../song-parser";
import { estimateBeats } from "../rhythm";
import { detectKey, romanNumeral } from "../key-detect";
import { optimizeProgression } from "../optimizer";

function chord(symbol: string) {
  const result = parseChord(symbol);
  if (!result.ok) throw new Error(`No parsea ${symbol}: ${result.error.message}`);
  return result.chord;
}

function frets(display: string): Fret[] {
  const parsed = parseFretString(display);
  if (!parsed) throw new Error(`Digitación inválida: ${display}`);
  return parsed;
}

describe("notas", () => {
  it("parsea nombres y enharmonías", () => {
    expect(parseNoteName("C#")).toBe(1);
    expect(parseNoteName("Db")).toBe(1);
    expect(parseNoteName("E")).toBe(4);
    expect(parseNoteName("Bb")).toBe(10);
    expect(parseNoteName("H")).toBeNull();
  });
  it("afinación barítono D3 G3 B3 E4", () => {
    expect(BARITONE.strings).toEqual([50, 55, 59, 64]);
    expect(parseNoteWithOctave("D3")).toBe(50);
    expect(parseNoteWithOctave("E4")).toBe(64);
  });
});

describe("parser de acordes", () => {
  it("normaliza símbolos equivalentes", () => {
    expect(chord("F#°").quality).toBe("dim");
    expect(chord("F#dim").quality).toBe("dim");
    expect(chord("Cø").quality).toBe("m7b5");
    expect(chord("CM7").quality).toBe("maj7");
    expect(chord("CΔ7").quality).toBe("maj7");
    expect(chord("Cmaj7").quality).toBe("maj7");
    expect(chord("C-7").quality).toBe("m7");
    expect(chord("Bm7b5").quality).toBe("m7b5");
    expect(chord("C7M").quality).toBe("maj7"); // notación brasileña (CifraClub)
    expect(chord("G4").quality).toBe("sus4"); // notación corta: G4 = Gsus4
    expect(chord("G4").normalized).toBe("Gsus4");
    expect(chord("A2").quality).toBe("sus2"); // cifrado popular: la 3ª se reemplaza
  });

  it("paréntesis contextuales: con séptima es extensión, sin séptima es agregado", () => {
    // Con séptima → extensión (incluye la b7)
    expect(chord("Em7(9)").quality).toBe("m9");
    expect(chord("Em7(9)").normalized).toBe("Em9");
    expect(chord("C7(9)").quality).toBe("9");
    expect(chord("Cmaj7(9)").quality).toBe("maj9");
    expect(chord("C7(11)").quality).toBe("11");
    expect(chord("C7(13)").quality).toBe("13");
    expect(chord("Bb7(9,13)").quality).toBe("13");
    // Sin séptima → nota agregada o suspensión
    expect(chord("C(9)").quality).toBe("add9");
    expect(chord("Cm(9)").quality).toBe("madd9");
    expect(chord("C(4)").quality).toBe("sus4");
    expect(chord("C(2)").quality).toBe("sus2");
    // Suspensiones con séptima
    expect(chord("A7(4)").quality).toBe("7sus4");
    expect(chord("G7(4)").quality).toBe("7sus4");
    // Alteraciones entre paréntesis
    expect(chord("D7(b9)").quality).toBe("7b9");
    expect(chord("F#m7(b5)").quality).toBe("m7b5");
    expect(chord("C7(#11)").quality).toBe("7#11");
  });

  it("Em9 incluye la séptima; Em(add9) no — nunca se confunden", () => {
    const em9 = [...chordPitchClasses(chord("Em7(9)"))].sort((a, b) => a - b);
    expect(em9).toEqual([2, 4, 6, 7, 11]); // E G B D F#
    const emadd9 = [...chordPitchClasses(chord("Em(add9)"))].sort((a, b) => a - b);
    expect(emadd9).toEqual([4, 6, 7, 11]); // E G B F# — sin D
    // add4 mantiene la 3ª; sus4 la reemplaza
    expect([...chordPitchClasses(chord("Cadd4"))].sort((a, b) => a - b)).toEqual([0, 4, 5, 7]);
    expect([...chordPitchClasses(chord("Csus4"))].sort((a, b) => a - b)).toEqual([0, 5, 7]);
  });

  it("cifrado latino en entrada directa (Explorador)", () => {
    const mim9 = parseChordFlexible("Mim9");
    expect(mim9.ok && mim9.chord.root).toBe(4); // E
    expect(mim9.ok && mim9.chord.quality).toBe("m9");
    const solm = parseChordFlexible("Solm");
    expect(solm.ok && solm.chord.normalized).toBe("Gm");
    const sib7 = parseChordFlexible("Sib7");
    expect(sib7.ok && sib7.chord.normalized).toBe("Bb7");
    const dosm7 = parseChordFlexible("Do#m7");
    expect(dosm7.ok && dosm7.chord.normalized).toBe("C#m7");
  });

  it("Em9 en 4 cuerdas: omite la 5ª (B) pero conserva E-G-D-F#", () => {
    const list = generateVoicings(chord("Em7(9)"));
    expect(list.length).toBeGreaterThan(0);
    const shape = list.find((v) => v.display === "2-0-3-2");
    expect(shape).toBeDefined(); // E3 G3 D4 F#4
    expect(shape!.omitted.join(" ")).toContain("B");
    // Ningún voicing pierde las notas que definen el m9
    for (const v of list) {
      const pcs = new Set(v.pitchClasses);
      expect(pcs.has(4) && pcs.has(7) && pcs.has(2) && pcs.has(6), v.display).toBe(true);
    }
  });
  it("slash chords y 6/9", () => {
    const gb = chord("G/B");
    expect(gb.root).toBe(7);
    expect(gb.bass).toBe(11);
    expect(chord("C6/9").quality).toBe("69");
    expect(chord("C6/9").bass).toBeNull();
  });
  it("enharmonías C# / Db", () => {
    expect(chord("C#m7").root).toBe(1);
    expect(chord("Dbmaj7").root).toBe(1);
    expect(chord("Dbmaj7").useFlats).toBe(true);
  });
  it("rechaza símbolos inválidos con mensaje claro", () => {
    const bad = parseChord("H#m7");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.message).toContain("H#m7");
    expect(parseChord("Cxyz").ok).toBe(false);
  });
  it("construye pitch classes por intervalos", () => {
    expect([...chordPitchClasses(chord("C"))].sort((a, b) => a - b)).toEqual([0, 4, 7]);
    expect([...chordPitchClasses(chord("Cdim7"))].sort((a, b) => a - b)).toEqual([0, 3, 6, 9]);
    expect([...chordPitchClasses(chord("A7b9"))].sort((a, b) => a - b)).toEqual([9, 1, 4, 7, 10].sort((a, b) => a - b));
  });
});

describe("casos obligatorios de la spec (20.x)", () => {
  it("20.1 E = 2-1-0-0 es E mayor válido", () => {
    const report = validateVoicing(chord("E"), frets("2-1-0-0"));
    expect(report.voicing.noteNames).toEqual(["E3", "G#3", "B3", "E4"]);
    expect(report.status).toBe("exact");
    expect(report.valid).toBe(true);
    expect(report.voicing.bassNote).toBe("E");
    expect(report.voicing.inversion).toBe("posición fundamental");
    expect(report.voicing.omitted).toEqual([]);
  });

  it("20.2 E = 2-4-4-4 se rechaza como E y se identifica como Emaj7", () => {
    const report = validateVoicing(chord("E"), frets("2-4-4-4"));
    expect(report.valid).toBe(false);
    expect(report.status).toBe("invalid");
    expect(report.problems.join(" ")).toContain("D#");
    const id = identifyChord(frets("2-4-4-4"));
    expect(id.matches[0].symbol).toBe("Emaj7");
  });

  it("20.3 F#dim = 4-2-1-2 es válido", () => {
    const report = validateVoicing(chord("F#dim"), frets("4-2-1-2"));
    expect(report.valid).toBe(true);
    expect(report.status).toBe("exact");
    expect(report.voicing.pitchClasses.map((pc) => pcName(pc, false))).toEqual(["F#", "A", "C", "F#"]);
  });

  it("20.4 F#dim = 4-5-4-5 es inválido por D#", () => {
    const report = validateVoicing(chord("F#dim"), frets("4-5-4-5"));
    expect(report.valid).toBe(false);
    expect(report.problems.join(" ")).toContain("D#");
  });

  it("20.5 C#m = x-6-5-4 válido con C# en el bajo", () => {
    const report = validateVoicing(chord("C#m"), frets("x-6-5-4"));
    expect(report.valid).toBe(true);
    expect(report.status).toBe("exact");
    expect(report.voicing.bassNote).toBe("C#");
    expect(report.voicing.inversion).toBe("posición fundamental");
  });

  it("20.6 G#m = 6-4-4-4 válido con G# en el bajo", () => {
    const report = validateVoicing(chord("G#m"), frets("6-4-4-4"));
    expect(report.valid).toBe(true);
    expect(report.voicing.bassNote).toBe("G#");
  });

  it("20.7 B = x-4-4-2 válido", () => {
    const report = validateVoicing(chord("B"), frets("x-4-4-2"));
    expect(report.valid).toBe(true);
    expect(report.status).toBe("exact");
  });

  it("20.8 B7 = x-4-4-5 parcial válido con quinta omitida", () => {
    const report = validateVoicing(chord("B7"), frets("x-4-4-5"));
    expect(report.valid).toBe(true);
    expect(report.status).toBe("partial");
    expect(report.voicing.omitted.join(" ")).toContain("F#");
    expect(report.voicing.omitted.join(" ")).toContain("5");
  });
});

describe("validación adicional", () => {
  it("slash chord exige el bajo indicado", () => {
    // C/E: 2-0-1-0 → D? no: D-G-B-E con 2-0-1-0 = E G C E → bajo E ✓
    const ok = validateVoicing(chord("C/E"), frets("2-0-1-0"));
    expect(ok.valid).toBe(true);
    expect(ok.voicing.bassNote).toBe("E");
    // C con bajo C: x-5-5-3? G? no… C en x-5-5-3 = C E G... espera: G+5=C3? G3+5=C4, B3+5=E4, E4+3=G4 → C E G bajo C ✓
    const wrongBass = validateVoicing(chord("C/E"), frets("x-5-5-3"));
    expect(wrongBass.valid).toBe(false);
    expect(wrongBass.problems.join(" ")).toContain("E");
  });

  it("las cuerdas silenciadas no cuentan para el bajo", () => {
    const report = validateVoicing(chord("C#m"), frets("x-6-5-4"));
    expect(report.voicing.bassNote).toBe("C#"); // el G#4? no: G3+6=C#4 es el bajo real
    expect(report.voicing.bassMidi).toBe(61);
  });

  it("acorde sin la tercera es inválido (nota imprescindible)", () => {
    // x-5-8-x = C4 y G4: solo fundamental y quinta, falta la 3ª
    const report = validateVoicing(chord("C"), frets("x-5-8-x"), { minStrings: 2 });
    expect(report.valid).toBe(false);
    expect(report.problems.join(" ")).toContain("E");
  });

  it("la quinta omitida sí es aceptable (x-5-5-x = C y E)", () => {
    const report = validateVoicing(chord("C"), frets("x-5-5-x"), { minStrings: 2 });
    expect(report.valid).toBe(true);
    expect(report.status).toBe("partial");
  });
});

describe("inversiones como ciudadanos de primera", () => {
  it("Am = 2-2-1-0 es Am exacto en 2ª inversión (E en el bajo)", () => {
    const report = validateVoicing(chord("Am"), frets("2-2-1-0"));
    expect(report.valid).toBe(true);
    expect(report.status).toBe("exact");
    expect(report.voicing.noteNames).toEqual(["E3", "A3", "C4", "E4"]);
    expect(report.voicing.bassNote).toBe("E");
    expect(report.voicing.inversion).toBe("2ª inversión (5ª en el bajo)");
  });

  it("la forma clásica 2-2-1-0 queda entre las primeras recomendaciones de Am", () => {
    const list = generateVoicings(chord("Am"));
    const idx = list.findIndex((v) => v.display === "2-2-1-0");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(4);
  });

  it("genera las tres inversiones de un acorde con séptima (C7)", () => {
    const list = generateVoicings(chord("C7"), { minStrings: 3 });
    const inversions = new Set(list.map((v) => v.bassDegree));
    expect(inversions.has("1")).toBe(true); // fundamental
    expect(inversions.has("3")).toBe(true); // 1ª inversión
    expect(inversions.has("5")).toBe(true); // 2ª inversión
    expect(inversions.has("b7")).toBe(true); // 3ª inversión
  });

  it("una triada genera 1ª y 2ª inversión además de la fundamental", () => {
    const list = generateVoicings(chord("C"));
    const inversions = new Set(list.map((v) => v.bassDegree));
    expect(inversions.has("1")).toBe(true);
    expect(inversions.has("3")).toBe(true);
    expect(inversions.has("5")).toBe(true);
  });
});

describe("generador de voicings", () => {
  it("encuentra las formas clásicas", () => {
    const shapes = (symbol: string) => generateVoicings(chord(symbol)).map((v) => v.display);
    expect(shapes("E")).toContain("2-1-0-0");
    expect(shapes("C#m")).toContain("x-6-5-4");
    expect(shapes("G#m")).toContain("6-4-4-4");
    expect(shapes("B")).toContain("x-4-4-2");
    expect(shapes("B7")).toContain("x-4-4-5");
    expect(shapes("F#dim")).toContain("4-2-1-2");
    expect(shapes("F#m")).toContain("4-2-2-2");
    expect(shapes("C")).toContain("2-0-1-3");
    // Ojo: 2-0-1-0 (que sugiere la spec) es E-G-C-E = C/E, NO es Am.
    // Las formas reales de Am en barítono: x-2-1-0 (abierta), 2-2-1-0
    // (forma clásica de guitarra, 2ª inversión) y 7-5-5-5.
    expect(shapes("Am")).toContain("x-2-1-0");
    expect(shapes("Am")).toContain("2-2-1-0");
    expect(shapes("Am")).toContain("7-5-5-5");
    expect(shapes("G")).toContain("0-0-0-3");
    expect(shapes("D")).toContain("0-2-3-2");
  });

  it("todos los voicings generados pasan la validación", () => {
    for (const symbol of ["C", "C#m7", "F#dim", "B7", "Ebmaj7", "Aadd9", "G13", "Dm7b5", "C/G"]) {
      const c = chord(symbol);
      const list = generateVoicings(c);
      expect(list.length).toBeGreaterThan(0);
      for (const v of list) {
        const report = validateVoicing(c, v.frets);
        expect(report.valid, `${symbol} → ${v.display}`).toBe(true);
      }
    }
  });

  it("requireRootInBass excluye inversiones", () => {
    const list = generateVoicings(chord("C"), { requireRootInBass: true });
    for (const v of list) expect(v.bassNote).toBe("C");
  });

  it("slash chords: el bajo indicado es la nota más grave", () => {
    const list = generateVoicings(chord("C/E"));
    expect(list.length).toBeGreaterThan(0);
    for (const v of list) expect(v.bassNote).toBe("E");
  });

  it("D/F# = 4-2-3-2: completo, con F# doblado en octavas (no unísono), y bien rankeado", () => {
    const report = validateVoicing(chord("D/F#"), frets("4-2-3-2"));
    expect(report.status).toBe("exact");
    expect(report.voicing.noteNames).toEqual(["F#3", "A3", "D4", "F#4"]);
    expect(report.voicing.bassNote).toBe("F#");
    expect(report.voicing.unisonCount).toBe(0); // octavas, no unísono
    const list = generateVoicings(chord("D/F#"));
    const idx = list.findIndex((v) => v.display === "4-2-3-2");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(3);
    // Y el optimizador la elige en una canción, sin mutear la prima
    const parsed = parseSong("G  D/F#  Em  C");
    const result = optimizeProgression(parsed.occurrences);
    const dfs = result.occurrences.find((o) => o.occurrence.chord.normalized === "D/F#");
    expect(dfs?.voicing.display).toBe("4-2-3-2");
  });

  it("los unísonos sí se penalizan (E 2-4-0-4 tiene B3 dos veces)", () => {
    const report = validateVoicing(chord("E"), frets("2-4-0-4"));
    expect(report.valid).toBe(true); // es un E válido…
    expect(report.voicing.unisonCount).toBe(1); // …pero con unísono
    const list = generateVoicings(chord("E"));
    const idxGood = list.findIndex((v) => v.display === "2-1-0-0");
    const idxUnison = list.findIndex((v) => v.display === "2-4-0-4");
    expect(idxGood).toBeLessThan(idxUnison);
  });

  it("respeta el traste máximo", () => {
    const list = generateVoicings(chord("C#m"), { maxFret: 5 });
    for (const v of list) expect(v.maxFretUsed).toBeLessThanOrEqual(5);
  });
});

describe("identificador inverso", () => {
  it("2-1-0-0 → E", () => {
    const id = identifyChord(frets("2-1-0-0"));
    expect(id.noteNames).toEqual(["E", "G#", "B", "E"]);
    expect(id.matches[0].symbol).toBe("E");
  });
  it("2-4-4-4 → Emaj7", () => {
    const id = identifyChord(frets("2-4-4-4"));
    expect(id.matches[0].symbol).toBe("Emaj7");
  });
  it("x-6-5-4 → C#m", () => {
    const id = identifyChord(frets("x-6-5-4"));
    expect(id.matches[0].symbol).toBe("C#m");
  });
});

describe("parser de canciones", () => {
  const song = `Título: Prueba

[Intro]
E        F#m       C#m
Alguna letra por aquí
F#dim    B7        E
Otra línea de letra`;

  it("separa acordes de letra y detecta secciones", () => {
    const parsed = parseSong(song);
    expect(parsed.title).toBe("Prueba");
    expect(parsed.uniqueChords.map((c) => c.normalized)).toEqual(["E", "F#m", "C#m", "F#dim", "B7"]);
    expect(parsed.occurrences).toHaveLength(6);
    expect(parsed.occurrences[0].sectionName).toBe("Intro");
    const lyricLines = parsed.lines.filter((l) => l.type === "lyric");
    expect(lyricLines).toHaveLength(2);
  });

  it("no confunde letra con acordes", () => {
    const parsed = parseSong("A mi me gusta el mar\nsol de la mañana");
    expect(parsed.occurrences).toHaveLength(0);
  });

  it("soporta formato [E]inline", () => {
    const parsed = parseSong("El [E]sol ca[F#m]lienta");
    expect(parsed.occurrences.map((o) => o.chord.normalized)).toEqual(["E", "F#m"]);
    const lyric = parsed.lines.find((l) => l.type === "lyric");
    expect(lyric?.text).toBe("El sol calienta");
  });

  it("acordes con paréntesis sobreviven al parser de canciones", () => {
    const parsed = parseSong(
      "     D/F#              Em7(9)\nLas tazas sobre el mantel\n    A7(4)          Em7(9)\nUn poco de miel no basta",
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.occurrences.map((o) => o.chord.normalized)).toEqual([
      "D/F#",
      "Em9",
      "A7sus4",
      "Em9",
    ]);
    // Y los envolventes se siguen limpiando: "(E)" es un E
    const wrapped = parseSong("(E)  (Am)\nletra de prueba aquí");
    expect(wrapped.occurrences.map((o) => o.chord.normalized)).toEqual(["E", "Am"]);
  });

  it("reporta acordes ilegibles en líneas de acordes", () => {
    const parsed = parseSong("E   H#m7   B7\nletra letra letra");
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.errors[0]).toContain("H#m7");
  });
});

describe("edición de acordes de la canción", () => {
  const text = "E  F#m  E\nletra de prueba aquí";

  it("cambia todas las apariciones de un símbolo", () => {
    const { song: edited, errors } = applyChordEdits(parseSong(text), {
      bySymbol: { E: "E7" },
      byOccurrence: {},
    });
    expect(errors).toEqual([]);
    expect(edited.occurrences.map((o) => o.chord.normalized)).toEqual(["E7", "F#m", "E7"]);
    expect(edited.occurrences[0].originalSymbol).toBe("E");
    expect(edited.uniqueChords.map((c) => c.normalized)).toEqual(["E7", "F#m"]);
    const chordLine = edited.lines.find((l) => l.type === "chords");
    expect(chordLine?.type === "chords" && chordLine.tokens[0].raw).toBe("E7");
  });

  it("un cambio puntual tiene prioridad sobre el global", () => {
    const { song: edited } = applyChordEdits(parseSong(text), {
      bySymbol: { E: "E7" },
      byOccurrence: { 0: "C" },
    });
    expect(edited.occurrences.map((o) => o.chord.normalized)).toEqual(["C", "F#m", "E7"]);
  });

  it("una edición inválida se reporta y no rompe la canción", () => {
    const { song: edited, errors } = applyChordEdits(parseSong(text), {
      bySymbol: { E: "H#x" },
      byOccurrence: {},
    });
    expect(errors.length).toBe(1);
    expect(edited.occurrences[0].chord.normalized).toBe("E");
  });
});

describe("ritmo", () => {
  it("anotaciones explícitas E*2 definen la duración", () => {
    const parsed = parseSong("C*4  G*2  Am  F\nletra de prueba aquí va");
    expect(parsed.occurrences.map((o) => o.chord.normalized)).toEqual(["C", "G", "Am", "F"]);
    const beats = estimateBeats(parsed, "uniform");
    expect(beats[0]).toBe(4);
    expect(beats[1]).toBe(2);
    expect(beats[2]).toBe(1);
  });

  it("modo layout: un acorde que abarca más letra dura más", () => {
    const parsed = parseSong(
      "C               G   Am  F\nuna letra bien larga acá va",
    );
    const beats = estimateBeats(parsed, "layout");
    // C abarca mucho más texto que G y Am
    expect(beats[0]).toBeGreaterThan(beats[1]);
    expect(beats[1]).toBeGreaterThanOrEqual(0.5);
    // cuantizado a medios tiempos
    for (const b of beats) expect(b * 2).toBe(Math.round(b * 2));
  });

  it("modo uniforme: todos iguales salvo anotaciones", () => {
    const parsed = parseSong("C        G  Am\nletra de prueba aquí");
    expect(estimateBeats(parsed, "uniform")).toEqual([1, 1, 1]);
  });
});

describe("tonalidad", () => {
  it("detecta E mayor en la progresión semilla", () => {
    const symbols = ["E", "F#m", "C#m", "F#dim", "B7", "E"];
    const key = detectKey(symbols.map(chord));
    expect(key?.name).toContain("E");
    expect(key?.mode).toBe("major");
  });
  it("detecta Am", () => {
    const key = detectKey(["Am", "Dm", "E7", "Am"].map(chord));
    expect(key?.mode).toBe("minor");
    expect(key?.tonic).toBe(9);
  });

  it("Bajan (Spinetta) es E mayor aunque C#m aparezca más veces: mandan las cadencias B7→E", () => {
    const seq =
      "E G E G E G E G E F#m C#m F#dim B7 E F#m C#m F#dim B7 C#m G#m B C#m G#m B Cdim C#m C Am G#m F#m C#m E F#m C#m F#dim B E F#m C#m F#dim B C#m G#m B C#m G#m B Cdim C#m C Am G#m F#m C#m B7 C#m";
    const key = detectKey(seq.split(" ").map(chord));
    expect(key?.mode).toBe("major");
    expect(key?.tonic).toBe(4); // E
  });

  it("función armónica: grados romanos en E mayor", () => {
    const key = detectKey(["E", "F#m", "C#m", "F#dim", "B7", "E"].map(chord))!;
    expect(romanNumeral(chord("E"), key)).toBe("I");
    expect(romanNumeral(chord("F#m"), key)).toBe("ii");
    expect(romanNumeral(chord("C#m"), key)).toBe("vi");
    expect(romanNumeral(chord("B7"), key)).toBe("V7");
    expect(romanNumeral(chord("F#dim"), key)).toBe("ii°");
    expect(romanNumeral(chord("G"), key)).toBe("bIII"); // préstamo
    expect(romanNumeral(chord("A"), key)).toBe("IV");
  });

  it("una canción genuinamente menor sigue detectándose menor", () => {
    const key = detectKey("C#m A B G#7 C#m A G#7 C#m".split(" ").map(chord));
    expect(key?.mode).toBe("minor");
    expect(key?.tonic).toBe(1); // C#
  });
});

describe("optimizador global", () => {
  const seed = `E  F#m  C#m  F#dim  B7
E  F#m  C#m  F#dim  B7
C#m  G#m  B  C#m
G#m  B  Cdim  C#m
C  Am  G#m  F#m`;

  it("produce un arreglo completo, válido y tocable", () => {
    const parsed = parseSong(seed);
    expect(parsed.occurrences).toHaveLength(22);
    const result = optimizeProgression(parsed.occurrences);
    expect(result.unplayable).toHaveLength(0);
    expect(result.occurrences).toHaveLength(22);
    for (const o of result.occurrences) {
      const report = validateVoicing(o.occurrence.chord, o.voicing.frets);
      expect(report.valid, `${o.occurrence.chord.normalized} → ${o.voicing.display}`).toBe(true);
      expect(o.voicing.difficulty).toBeLessThan(8);
      expect(o.reason.length).toBeGreaterThan(3);
    }
  });

  it("mantiene voicings consistentes para el mismo símbolo en el mismo contexto", () => {
    const parsed = parseSong("E F#m E F#m E F#m");
    const result = optimizeProgression(parsed.occurrences);
    const eShapes = new Set(
      result.occurrences.filter((o) => o.occurrence.chord.normalized === "E").map((o) => o.voicing.display),
    );
    expect(eShapes.size).toBe(1);
  });

  it("respeta un voicing bloqueado", () => {
    const parsed = parseSong("E A B7");
    const result = optimizeProgression(parsed.occurrences, { locks: { 0: "x-9-9-7"} });
    expect(result.occurrences[0].voicing.display).toBe("x-9-9-7");
    expect(result.occurrences[0].locked).toBe(true);
  });

  it("modo fácil se queda en trastes bajos", () => {
    const parsed = parseSong("C G Am F");
    const result = optimizeProgression(parsed.occurrences, { mode: "easy" });
    for (const o of result.occurrences) expect(o.voicing.maxFretUsed).toBeLessThanOrEqual(7);
  });
});
