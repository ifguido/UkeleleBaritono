import { describe, expect, it } from "vitest";
import {
  SCALES,
  SCALE_IDS,
  Scale,
  buildScale,
  parentRootOf,
  parseScaleQuery,
  relatedScales,
} from "../scales";
import {
  fretboardNotes,
  generatePositions,
  threeNotesPerString,
} from "../scale-fretboard";
import {
  chordsInScale,
  harmonizeScale,
  homeChord,
  progressionsFor,
  romanFor,
} from "../scale-harmony";
import {
  PATTERNS,
  applyPattern,
  availableLicks,
  renderLick,
} from "../scale-patterns";
import { BARITONE } from "../notes";
import { FORMULAS } from "../chords";

const ROOTS = ["C", "A", "Eb", "F#", "Bb", "G", "Db", "E"];

function scale(root: string, id: string): Scale {
  const built = buildScale(root, id);
  if (!built) throw new Error(`No construye ${root} ${id}`);
  return built;
}

/** Cada escala en cada tónica: el barrido que usan casi todos los tests. */
function everyScale(fn: (s: Scale) => void): void {
  for (const id of SCALE_IDS) {
    for (const root of ROOTS) fn(scale(root, id));
  }
}

describe("deletreo de escalas", () => {
  it("cada grado usa la letra que le toca", () => {
    expect(scale("C", "major").notes.map((n) => n.name)).toEqual(
      ["C", "D", "E", "F", "G", "A", "B"],
    );
    expect(scale("Eb", "major").notes.map((n) => n.name)).toEqual(
      ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
    );
    // La b2 de C es Db, nunca C#: dos notas no pueden compartir la letra C.
    expect(scale("C", "phrygianDominant").notes.map((n) => n.name)).toEqual(
      ["C", "Db", "E", "F", "G", "Ab", "Bb"],
    );
    // El lidio de F# tiene B#: es la 4ª aumentada, no la 5ª disminuida.
    expect(scale("F#", "lydian").notes.map((n) => n.name)).toEqual(
      ["F#", "G#", "A#", "B#", "C#", "D#", "E#"],
    );
    expect(scale("A", "bluesMinor").notes.map((n) => n.name)).toEqual(
      ["A", "C", "D", "Eb", "E", "G"],
    );
    // La bebop dominante lleva b7 y 7: las dos son la letra de la 7ª.
    expect(scale("Bb", "bebopDominant").notes.map((n) => n.name)).toEqual(
      ["Bb", "C", "D", "Eb", "F", "G", "Ab", "A"],
    );
  });

  it("ninguna escala repite pitch class ni deja un nombre sin resolver", () => {
    everyScale((s) => {
      expect(new Set(s.pitchClasses).size).toBe(s.notes.length);
      for (const note of s.notes) {
        expect(note.name).not.toContain("?");
        expect((s.root + note.semitones) % 12).toBe(note.pc);
      }
    });
  });
});

describe("modos", () => {
  it("un modo tiene exactamente las notas de su escala padre", () => {
    for (const id of SCALE_IDS) {
      const formula = SCALES[id];
      if (!formula.mode) continue;
      for (const root of ROOTS) {
        const modeScale = scale(root, id);
        const parent = parentRootOf(modeScale);
        expect(parent).not.toBeNull();
        const parentScale = scale(parent!.rootName, parent!.formula.id);
        expect([...modeScale.pcSet].sort((a, b) => a - b)).toEqual(
          [...parentScale.pcSet].sort((a, b) => a - b),
        );
      }
    }
  });

  it("D dórico es C mayor desde el 2º grado", () => {
    const parent = parentRootOf(scale("D", "dorian"))!;
    expect(parent.rootName).toBe("C");
    expect(parent.formula.id).toBe("major");
    const hermanos = relatedScales(scale("D", "dorian")).map((r) => r.formula.id);
    expect(hermanos).toContain("phrygian");
    expect(hermanos).toContain("aeolian");
    expect(hermanos).not.toContain("dorian");
  });
});

describe("posiciones en el diapasón", () => {
  it("toda nota del mástil pertenece a la escala", () => {
    everyScale((s) => {
      for (const note of fretboardNotes(s, BARITONE, 15)) {
        expect(s.pcSet.has(note.pc)).toBe(true);
        expect(BARITONE.strings[note.stringIdx] + note.fret).toBe(note.midi);
      }
    });
  });

  it("cada caja es tocable: sin cuerdas mudas, sin saltos y de al menos una octava", () => {
    everyScale((s) => {
      const positions = generatePositions(s);
      expect(positions.length).toBeGreaterThan(0);
      for (const position of positions) {
        // Ninguna cuerda queda sin notas
        expect(position.byString.every((notes) => notes.length > 0)).toBe(true);
        // El recorrido sube siempre y no repite alturas
        for (let i = 1; i < position.path.length; i++) {
          expect(position.path[i].midi).toBeGreaterThan(position.path[i - 1].midi);
        }
        expect(position.range).toBeGreaterThanOrEqual(12);
        // La mano llega: cuatro dedos, cinco trastes con estiramiento
        expect(position.span).toBeLessThanOrEqual(5);
        for (const note of position.path) {
          expect(s.pcSet.has(note.pc)).toBe(true);
          expect(note.finger).toBeGreaterThanOrEqual(0);
          expect(note.finger).toBeLessThanOrEqual(4);
        }
      }
    });
  });

  it("hay una caja por nota de la escala, salvo las que otra ya contiene", () => {
    // Las cinco cajas de la pentatónica y las siete de la mayor son las que
    // se enseñan en cualquier método: el motor llega a las mismas.
    expect(generatePositions(scale("A", "pentatonicMinor")).length).toBe(5);
    expect(generatePositions(scale("C", "major")).length).toBe(7);

    everyScale((s) => {
      const positions = generatePositions(s);
      // Una caja por cada nota de la escala en la 4ª cuerda, más la posición
      // al aire (que existe aunque la 4ª cuerda suelta no sea de la escala).
      expect(positions.length, `demasiadas cajas en ${s.name}`).toBeLessThanOrEqual(
        s.notes.length + 1,
      );
      // Ninguna caja está contenida en otra: tocar la chica sería tocar la
      // grande a medias.
      const sets = positions.map((p) => new Set(p.path.map((n) => `${n.stringIdx}:${n.fret}`)));
      for (let i = 0; i < sets.length; i++) {
        for (let j = 0; j < sets.length; j++) {
          if (i === j) continue;
          const contenida = [...sets[i]].every((key) => sets[j].has(key));
          expect(contenida, `${positions[i].label} está dentro de ${positions[j].label} en ${s.name}`).toBe(false);
        }
      }
    });
  });

  it("tres notas por cuerda usa doce notas consecutivas de la escala", () => {
    everyScale((s) => {
      for (const position of threeNotesPerString(s)) {
        expect(position.byString.every((notes) => notes.length === 3)).toBe(true);
        expect(position.path.length).toBe(12);
        for (let i = 1; i < position.path.length; i++) {
          expect(position.path[i].midi).toBeGreaterThan(position.path[i - 1].midi);
        }
        for (const note of position.path) {
          expect(s.pcSet.has(note.pc)).toBe(true);
          expect(note.fret).toBeGreaterThanOrEqual(0);
          expect(note.fret).toBeLessThanOrEqual(15);
        }
      }
    });
  });

  it("las escalas de menos de 7 notas no admiten tres por cuerda", () => {
    expect(threeNotesPerString(scale("A", "pentatonicMinor"))).toEqual([]);
    expect(threeNotesPerString(scale("C", "major")).length).toBeGreaterThan(0);
  });
});

describe("armonización", () => {
  it("C mayor da los acordes del libro", () => {
    const grados = harmonizeScale(scale("C", "major"));
    expect(grados.map((g) => g.triad?.symbol)).toEqual(
      ["C", "Dm", "Em", "F", "G", "Am", "Bdim"],
    );
    expect(grados.map((g) => g.seventh?.symbol)).toEqual(
      ["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"],
    );
    expect(grados.map((g) => g.seventh?.roman)).toEqual(
      ["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "viiø"],
    );
  });

  it("A menor armónica pone el V dominante", () => {
    const grados = harmonizeScale(scale("A", "harmonicMinor"));
    expect(grados[0].seventh?.symbol).toBe("Am(maj7)");
    expect(grados[4].seventh?.symbol).toBe("E7");
    expect(grados[6].seventh?.symbol).toBe("G#dim7");
  });

  it("todo acorde armonizado y compatible entra entero en la escala", () => {
    everyScale((s) => {
      const check = (symbol: string, root: number, quality: string) => {
        for (const interval of FORMULAS[quality].intervals) {
          expect(
            s.pcSet.has((root + interval.semitones) % 12),
            `${symbol} no entra en ${s.name}`,
          ).toBe(true);
        }
      };
      for (const grade of harmonizeScale(s)) {
        for (const chord of [grade.triad, grade.seventh]) {
          if (chord) check(chord.symbol, chord.chord.root, chord.quality);
        }
      }
      for (const group of chordsInScale(s)) {
        for (const chord of group.chords) {
          check(chord.symbol, chord.chord.root, chord.quality);
          expect(chord.chord.root).toBe(group.note.pc);
        }
      }
    });
  });

  it("las escalas de 5 y 6 notas no se armonizan por terceras", () => {
    expect(harmonizeScale(scale("A", "pentatonicMinor"))).toEqual([]);
    expect(harmonizeScale(scale("A", "bluesMinor"))).toEqual([]);
    // pero siempre hay acordes compatibles
    expect(chordsInScale(scale("A", "bluesMinor")).some((g) => g.chords.length > 0)).toBe(true);
  });

  it("cifrado funcional", () => {
    expect(romanFor("1", "maj7")).toBe("Imaj7");
    expect(romanFor("2", "m7")).toBe("ii7");
    expect(romanFor("b3", "major")).toBe("bIII");
    expect(romanFor("7", "m7b5")).toBe("viiø");
    expect(romanFor("7", "dim7")).toBe("vii°7");
    expect(romanFor("#4", "7")).toBe("#IV7");
  });

  it("toda escala tiene acorde casa y al menos una progresión", () => {
    everyScale((s) => {
      expect(homeChord(s), `sin acorde casa: ${s.name}`).not.toBeNull();
      const progressions = progressionsFor(s);
      expect(progressions.length, `sin progresiones: ${s.name}`).toBeGreaterThan(0);
      for (const progression of progressions) {
        expect(progression.chords.length).toBeGreaterThan(0);
        for (const chord of progression.chords) expect(chord.bars).toBeGreaterThan(0);
      }
    });
  });

  it("el blues de 12 compases en A es A7 D7 E7 donde corresponde", () => {
    const blues = progressionsFor(scale("A", "bluesMinor"))[0];
    expect(blues.name).toBe("Blues de 12 compases");
    expect(blues.chords.map((c) => c.symbol)).toEqual(
      ["A7", "D7", "A7", "A7", "D7", "D7", "A7", "A7", "E7", "D7", "A7", "E7"],
    );
  });
});

describe("secuencias y frases", () => {
  it("toda secuencia sale del recorrido de la caja", () => {
    everyScale((s) => {
      const position = generatePositions(s)[0];
      const inBox = new Set(position.path.map((n) => `${n.stringIdx}:${n.fret}`));
      for (const pattern of PATTERNS) {
        const rendered = applyPattern(position, pattern);
        expect(rendered.notes.length, `${pattern.id} vacío en ${s.name}`).toBeGreaterThan(0);
        for (const note of rendered.notes) {
          expect(inBox.has(`${note.stringIdx}:${note.fret}`)).toBe(true);
        }
      }
    });
  });

  it("una frase solo aparece si la escala tiene todos sus grados", () => {
    const pentatonic = scale("A", "pentatonicMinor");
    const blues = scale("A", "bluesMinor");
    const conBlueNote = (s: Scale) => availableLicks(s).some((l) => l.id === "blues-ladder");
    // La escalera usa la b5: existe en el blues, no en la pentatónica.
    expect(conBlueNote(pentatonic)).toBe(false);
    expect(conBlueNote(blues)).toBe(true);
  });

  it("las frases caen enteras en el mástil y en la escala", () => {
    everyScale((s) => {
      const position = generatePositions(s)[0];
      for (const lick of availableLicks(s)) {
        const notes = renderLick(s, lick, position);
        expect(notes.length, `${lick.id} incompleto en ${s.name}`).toBe(lick.steps.length);
        for (const note of notes) {
          expect(s.pcSet.has(note.pc)).toBe(true);
          expect(note.fret).toBeGreaterThanOrEqual(0);
          expect(note.fret).toBeLessThanOrEqual(15);
        }
        // El dibujo melódico se conserva: los intervalos entre notas no cambian
        const expected = lick.steps.map(
          (step) => s.notes.find((n) => n.degree === step.degree)!.semitones + step.octave * 12,
        );
        for (let i = 1; i < notes.length; i++) {
          expect(notes[i].midi - notes[i - 1].midi).toBe(expected[i] - expected[i - 1]);
        }
      }
    });
  });
});

describe("parseo de escalas", () => {
  it("entiende letras, solfeo y nombres alternativos", () => {
    const parsed = (q: string) => {
      const result = parseScaleQuery(q);
      if (!result.ok || !result.scale) throw new Error(result.message);
      return `${result.scale.rootName} ${result.scale.formula.id}`;
    };
    expect(parsed("A blues")).toBe("A bluesMinor");
    expect(parsed("Do menor armonica")).toBe("C harmonicMinor");
    expect(parsed("F# lidio")).toBe("F# lydian");
    expect(parsed("Bb pentatónica mayor")).toBe("Bb pentatonicMajor");
    expect(parsed("Sol mixolidio")).toBe("G mixolydian");
    expect(parsed("Eb alterada")).toBe("Eb altered");
    expect(parsed("C")).toBe("C major"); // sin nombre de escala: mayor
    expect(parsed("A minor pentatonic")).toBe("A pentatonicMinor");
  });

  it("explica qué falló en vez de romperse", () => {
    expect(parseScaleQuery("zzz").ok).toBe(false);
    expect(parseScaleQuery("C escala inventada").ok).toBe(false);
    expect(parseScaleQuery("").message).toContain("Escribí");
  });
});
