/**
 * Qué acordes salen de una escala.
 *
 * Dos miradas, las dos calculadas:
 *  1. Armonización por terceras — apilar grados de la escala salteando uno.
 *  2. Acordes compatibles — cualquier fórmula de acorde cuyas notas estén
 *     todas dentro de la escala. Sirve para saber sobre qué se puede tocar.
 */

import { PitchClass, pcName } from "./notes";
import { FORMULAS, ParsedChord, parseChord } from "./chords";
import { Scale, ScaleNoteName } from "./scales";

export interface ScaleChord {
  /** Símbolo listo para el motor de voicings ("Ebmaj7"). */
  symbol: string;
  chord: ParsedChord;
  /** Grado de la escala sobre el que se construye ("1", "b3"…). */
  degree: string;
  degreeIndex: number;
  /** Cifrado funcional ("Imaj7", "iiø", "bVII"). */
  roman: string;
  quality: string;
  /** Nombre legible de la calidad ("séptima mayor"). */
  description: string;
  /** Cantidad de notas del acorde. */
  size: number;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

const MINOR_QUALITIES = new Set([
  "minor", "m6", "m7", "m9", "m11", "madd9", "mMaj7", "dim", "dim7", "m7b5",
]);

function degreeNumber(label: string): number {
  const num = parseInt(label.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(num) && num >= 1 ? num : 1;
}

function degreeAccidental(label: string): string {
  const m = /^(b+|#+)/.exec(label);
  return m ? m[1] : "";
}

/** "b3" + minor → "biii"; "5" + 7 → "V7"; "2" + m7b5 → "iiø". */
export function romanFor(degreeLabel: string, quality: string): string {
  const numeral = ROMAN[(degreeNumber(degreeLabel) - 1) % 7];
  const formula = FORMULAS[quality];
  let suffix = formula?.suffix ?? "";
  let base = numeral;
  if (MINOR_QUALITIES.has(quality)) {
    base = numeral.toLowerCase();
    suffix = suffix.replace(/^m(?![a-z])/, "");
  }
  if (quality === "dim") suffix = "°";
  if (quality === "dim7") suffix = "°7";
  if (quality === "m7b5") suffix = "ø";
  if (quality === "aug") suffix = "+";
  return degreeAccidental(degreeLabel) + base + suffix;
}

/**
 * Nombre de fundamental usable como símbolo de acorde. El deletreo de la
 * escala puede dar dobles alteraciones (Fx) que el cifrado no admite: en ese
 * caso se cae al nombre cromático.
 */
function chordRootName(note: ScaleNoteName, useFlats: boolean): string {
  if (/^[A-G](#|b)?$/.test(note.name)) return note.name;
  return pcName(note.pc, useFlats);
}

/** La calidad exacta cuyas notas coinciden una a una con `pcs`. */
function exactQuality(root: PitchClass, pcs: Iterable<PitchClass>): string | null {
  const semis = new Set<number>();
  for (const pc of pcs) semis.add(((pc - root) % 12 + 12) % 12);
  for (const quality of Object.keys(FORMULAS)) {
    const intervals = FORMULAS[quality].intervals.map((i) => i.semitones);
    if (intervals.length !== semis.size) continue;
    if (intervals.every((s) => semis.has(s))) return quality;
  }
  return null;
}

function makeScaleChord(
  scale: Scale,
  note: ScaleNoteName,
  quality: string,
): ScaleChord | null {
  const formula = FORMULAS[quality];
  if (!formula) return null;
  const symbol = chordRootName(note, scale.useFlats) + formula.suffix;
  const parsed = parseChord(symbol);
  if (!parsed.ok) return null;
  return {
    symbol: parsed.chord.normalized,
    chord: parsed.chord,
    degree: note.degree,
    degreeIndex: note.index,
    roman: romanFor(note.degree, quality),
    quality,
    description: formula.description,
    size: formula.intervals.length,
  };
}

export interface HarmonizedDegree {
  note: ScaleNoteName;
  /** Tríada por terceras de la escala (puede no existir con nombre conocido). */
  triad: ScaleChord | null;
  /** Cuatríada (séptima) por terceras de la escala. */
  seventh: ScaleChord | null;
  /** Notas apiladas, para mostrar aunque no tengan nombre de acorde. */
  triadNotes: string[];
  seventhNotes: string[];
}

/**
 * Armonización por terceras: sobre cada grado se apilan las notas
 * salteando una de la escala. Solo tiene sentido musical en escalas de
 * 7 notas (en las de 5 o 6 los "terceros" no son terceras).
 */
export function harmonizeScale(scale: Scale): HarmonizedDegree[] {
  const len = scale.notes.length;
  if (len < 7) return [];
  return scale.notes.map((note, i) => {
    const at = (offset: number) => scale.notes[(i + offset) % len];
    const triadNotes = [at(0), at(2), at(4)];
    const seventhNotes = [...triadNotes, at(6)];
    const triadQuality = exactQuality(note.pc, triadNotes.map((n) => n.pc));
    const seventhQuality = exactQuality(note.pc, seventhNotes.map((n) => n.pc));
    return {
      note,
      triad: triadQuality ? makeScaleChord(scale, note, triadQuality) : null,
      seventh: seventhQuality ? makeScaleChord(scale, note, seventhQuality) : null,
      triadNotes: triadNotes.map((n) => n.name),
      seventhNotes: seventhNotes.map((n) => n.name),
    };
  });
}

/**
 * Todos los acordes que entran enteros en la escala, agrupados por grado.
 * Es la respuesta a "¿sobre qué acordes puedo tocar esto?".
 */
export function chordsInScale(scale: Scale): { note: ScaleNoteName; chords: ScaleChord[] }[] {
  return scale.notes.map((note) => {
    const chords: ScaleChord[] = [];
    for (const quality of Object.keys(FORMULAS)) {
      const formula = FORMULAS[quality];
      const fits = formula.intervals.every((i) => scale.pcSet.has(((note.pc + i.semitones) % 12) as PitchClass));
      if (!fits) continue;
      const chord = makeScaleChord(scale, note, quality);
      if (chord) chords.push(chord);
    }
    chords.sort((a, b) => a.size - b.size || a.symbol.length - b.symbol.length);
    return { note, chords };
  });
}

/** El acorde que la escala "es": su casa armónica. */
export function homeChord(scale: Scale): ScaleChord | null {
  return makeScaleChord(scale, scale.notes[0], scale.formula.homeQuality);
}

// ── Progresiones típicas ────────────────────────────────────────────────

export interface ProgressionChord {
  symbol: string;
  chord: ParsedChord;
  roman: string;
  /** Duración relativa en compases. */
  bars: number;
}

export interface Progression {
  name: string;
  note: string;
  chords: ProgressionChord[];
}

/** [semitonos desde la tónica, calidad, compases] */
type ProgSpec = [number, string, number?];

interface ProgressionDef {
  name: string;
  note: string;
  spec: ProgSpec[];
}

const BLUES_12: ProgressionDef = {
  name: "Blues de 12 compases",
  note: "La forma que sostiene medio siglo de música. Un compás por acorde salvo donde se indica.",
  spec: [
    [0, "7"], [5, "7"], [0, "7"], [0, "7"],
    [5, "7"], [5, "7"], [0, "7"], [0, "7"],
    [7, "7"], [5, "7"], [0, "7"], [7, "7"],
  ],
};

const MINOR_BLUES: ProgressionDef = {
  name: "Blues menor",
  note: "Mismo esqueleto, acordes menores. El V puede ser dominante para que empuje.",
  spec: [
    [0, "m7"], [0, "m7"], [0, "m7"], [0, "m7"],
    [5, "m7"], [5, "m7"], [0, "m7"], [0, "m7"],
    [8, "7"], [7, "7"], [0, "m7"], [7, "7"],
  ],
};

const PROGRESSIONS: Record<string, ProgressionDef[]> = {
  major: [
    {
      name: "I–V–vi–IV",
      note: "El giro más usado del pop. Probá la pentatónica mayor encima.",
      spec: [[0, "major", 2], [7, "major", 2], [9, "minor", 2], [5, "major", 2]],
    },
    {
      name: "ii–V–I",
      note: "La cadencia del jazz. Sobre el V podés meter la alterada.",
      spec: [[2, "m7", 2], [7, "7", 2], [0, "maj7", 4]],
    },
    {
      name: "I–vi–ii–V",
      note: "El giro de los años 50, todavía en pie.",
      spec: [[0, "major", 2], [9, "minor", 2], [2, "m7", 2], [7, "7", 2]],
    },
  ],
  pentatonicMajor: [BLUES_12, {
    name: "I–IV–V",
    note: "Los tres acordes de siempre. La pentatónica mayor de la tónica funciona en los tres.",
    spec: [[0, "major", 2], [5, "major", 1], [7, "major", 1]],
  }],
  bluesMajor: [BLUES_12],
  bluesMinor: [BLUES_12, MINOR_BLUES],
  bluesComposite: [BLUES_12],
  pentatonicMinor: [MINOR_BLUES, {
    name: "i–bIII–IV (riff de rock)",
    note: "Todas las notas de la pentatónica menor entran en los tres acordes.",
    spec: [[0, "minor", 2], [3, "major", 1], [5, "major", 1]],
  }],
  suspendedPentatonic: [{
    name: "Vamp sus",
    note: "Sin 3ª en ningún lado: el color lo pone la escala.",
    spec: [[0, "7sus4", 2], [10, "major", 2]],
  }],
  aeolian: [
    {
      name: "i–bVI–bIII–bVII",
      note: "La progresión menor por excelencia del pop y el rock.",
      spec: [[0, "minor", 2], [8, "major", 2], [3, "major", 2], [10, "major", 2]],
    },
    {
      name: "i–iv–v",
      note: "Menor natural pura: el v es menor, no dominante.",
      spec: [[0, "minor", 2], [5, "minor", 1], [7, "minor", 1]],
    },
  ],
  dorian: [
    {
      name: "i–IV (vamp dórico)",
      note: "El IV mayor es la firma del modo: sale de la 6ª mayor.",
      spec: [[0, "m7", 2], [5, "major", 2]],
    },
    {
      name: "i–bVII–IV",
      note: "Funk y rock modal. No hay dominante, así que nunca resuelve.",
      spec: [[0, "m7", 2], [10, "major", 1], [5, "major", 1]],
    },
  ],
  phrygian: [{
    name: "i–bII",
    note: "Dos acordes y ya estás en territorio frigio. La b2 hace todo el trabajo.",
    spec: [[0, "minor", 2], [1, "major", 2]],
  }],
  lydian: [{
    name: "I–II (vamp lidio)",
    note: "El II mayor sale de la #4. Es el sonido de cine.",
    spec: [[0, "maj7", 2], [2, "major", 2]],
  }],
  mixolydian: [{
    name: "I–bVII–IV",
    note: "El bVII sale de la 7ª menor. Rock clásico puro.",
    spec: [[0, "7", 2], [10, "major", 1], [5, "major", 1]],
  }, BLUES_12],
  locrian: [{
    name: "iø–bII",
    note: "El locrio no descansa: usalo mientras dura el acorde semidisminuido.",
    spec: [[0, "m7b5", 2], [1, "major", 2]],
  }],
  harmonicMinor: [{
    name: "i–iv–V7–i",
    note: "El V dominante es lo que pide la menor armónica: la sensible viene de la 7ª mayor.",
    spec: [[0, "minor", 2], [5, "minor", 2], [7, "7", 2], [0, "minor", 2]],
  }],
  phrygianDominant: [{
    name: "Cadencia andaluza",
    note: "iv–bIII–bII–I visto desde el frigio dominante. El acorde final es mayor: ahí entra la escala.",
    spec: [[5, "minor", 1], [3, "major", 1], [1, "major", 1], [0, "major", 2]],
  }],
  melodicMinor: [{
    name: "i(maj7)–iv7–V7",
    note: "La sensible del i(maj7) es lo que distingue esta escala de la menor natural.",
    spec: [[0, "mMaj7", 2], [5, "m7", 2], [7, "7", 2]],
  }],
  altered: [{
    name: "ii–V7alt–i",
    note: "La alterada va sobre el V7 y sobre nada más. Un compás de tensión y resolvés.",
    spec: [[2, "m7b5", 2], [7, "7#9", 2], [0, "minor", 4]],
  }],
  lydianDominant: [{
    name: "I7#11 vamp",
    note: "Dominante que no resuelve: se queda ahí sonando brillante.",
    spec: [[0, "7#11", 2], [10, "maj7", 2]],
  }],
  diminishedHW: [{
    name: "V7b9–i",
    note: "La disminuida semitono-tono sobre el dominante, resolviendo al menor.",
    spec: [[0, "7b9", 2], [5, "minor", 2]],
  }],
  wholeTone: [{
    name: "I7#5 suspendido",
    note: "Sin semitonos no hay dirección: sirve para flotar antes de resolver.",
    spec: [[0, "7#5", 2], [5, "maj7", 2]],
  }],
  bebopDominant: [{
    name: "ii–V–I",
    note: "La bebop dominante entra sobre el V. En corcheas, las notas del acorde caen a tiempo.",
    spec: [[7, "m7", 2], [0, "7", 2], [5, "maj7", 4]],
  }],
};

/**
 * Progresiones donde esta escala funciona. Si no hay una definida a mano,
 * se arma una con los grados I–IV–V de la propia armonización.
 */
export function progressionsFor(scale: Scale): Progression[] {
  const defs = PROGRESSIONS[scale.formula.id] ?? fallbackProgressions(scale);
  const out: Progression[] = [];
  for (const def of defs) {
    const chords: ProgressionChord[] = [];
    let ok = true;
    for (const [semitones, quality, bars] of def.spec) {
      const pc = ((scale.root + semitones) % 12) as PitchClass;
      const note = scale.notes.find((n) => n.pc === pc);
      const rootName = note ? chordRootName(note, scale.useFlats) : pcName(pc, scale.useFlats);
      const formula = FORMULAS[quality];
      if (!formula) {
        ok = false;
        break;
      }
      const parsed = parseChord(rootName + formula.suffix);
      if (!parsed.ok) {
        ok = false;
        break;
      }
      chords.push({
        symbol: parsed.chord.normalized,
        chord: parsed.chord,
        roman: romanFor(note?.degree ?? `${semitones}`, quality),
        bars: bars ?? 1,
      });
    }
    if (ok) out.push({ name: def.name, note: def.note, chords });
  }
  return out;
}

/**
 * Cuando no hay una progresión escrita a mano, se arma con los tres grados
 * principales: la tónica y los grados más cercanos a la 4ª y la 5ª que la
 * escala realmente tenga, cada uno con una calidad que entre entera en ella.
 */
function fallbackProgressions(scale: Scale): ProgressionDef[] {
  const groups = chordsInScale(scale);
  // Se prefieren tríadas y cuatríadas por sobre power chords y rarezas.
  const pick = (semitones: number) => {
    const group = groups.find((g) => g.note.semitones === semitones);
    if (!group) return null;
    return (
      group.chords.find((c) => c.size === 3 && c.quality !== "5") ??
      group.chords.find((c) => c.size === 4) ??
      group.chords[0] ??
      null
    );
  };
  const near = (wanted: number, offsets: number[]) => {
    for (const offset of offsets) {
      const found = pick(((wanted + offset) % 12 + 12) % 12);
      if (found) return found;
    }
    return null;
  };

  const tonic = pick(0);
  const sub = near(5, [0, 1, -1, 2]);
  const dom = near(7, [0, 1, -1, 2]);
  if (!tonic || !sub || !dom) return [];

  const offsetOf = (chord: ScaleChord) => ((chord.chord.root - scale.root) % 12 + 12) % 12;
  return [
    {
      name: `${tonic.roman} – ${sub.roman} – ${dom.roman}`,
      note: "Los tres grados principales de esta escala, con las calidades que ella misma genera.",
      spec: [
        [0, tonic.quality, 2],
        [offsetOf(sub), sub.quality, 1],
        [offsetOf(dom), dom.quality, 1],
      ],
    },
  ];
}
