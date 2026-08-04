/**
 * La escala sobre el diapasón: mapa completo, cajas para puntear
 * y patrones de tres notas por cuerda.
 *
 * Todo se calcula desde los intervalos: no hay diagramas guardados.
 * Una posición es válida solo si cada nota cae realmente en la escala
 * y la mano puede alcanzarla.
 */

import { BARITONE, Midi, PitchClass, Tuning, midiName, midiToPc } from "./notes";
import { Scale, degreeOf } from "./scales";

export interface FretNote {
  stringIdx: number;
  /** 0 = cuerda al aire. */
  fret: number;
  midi: Midi;
  pc: PitchClass;
  /** Grado dentro de la escala ("1", "b3"…). */
  degree: string;
  /** Nombre deletreado según la escala ("Eb", "F#"). */
  name: string;
  /** Nombre con octava ("Eb3"). */
  fullName: string;
  /** Índice del grado dentro de la escala (0 = tónica). */
  scaleIndex: number;
  isRoot: boolean;
}

export interface PositionNote extends FretNote {
  /** 1–4; 0 = cuerda al aire. */
  finger: number;
}

export interface ScalePosition {
  id: string;
  /** Traste donde se apoya el índice. */
  baseFret: number;
  /** Trastes efectivamente abarcados por la mano. */
  span: number;
  /** Notas de la caja agrupadas por cuerda (grave → aguda). */
  byString: PositionNote[][];
  /** Recorrido ascendente, una nota por vez, sin repetir alturas. */
  path: PositionNote[];
  noteCount: number;
  rootCount: number;
  /** Semitonos entre la nota más grave y la más aguda del recorrido. */
  range: number;
  usesOpen: boolean;
  /** Requiere abrir la mano más allá de 4 trastes. */
  stretch: boolean;
  difficulty: number;
  /** "Caja 3 · traste 7". */
  label: string;
  /** Grado por el que arranca la caja. */
  startDegree: string;
}

/** Todas las notas de la escala en el diapasón. */
export function fretboardNotes(
  scale: Scale,
  tuning: Tuning = BARITONE,
  maxFret = 15,
): FretNote[] {
  const out: FretNote[] = [];
  tuning.strings.forEach((open, stringIdx) => {
    for (let fret = 0; fret <= maxFret; fret++) {
      const midi = open + fret;
      const pc = midiToPc(midi);
      const note = degreeOf(scale, pc);
      if (!note) continue;
      out.push({
        stringIdx,
        fret,
        midi,
        pc,
        degree: note.degree,
        name: note.name,
        fullName: `${note.name}${Math.floor(midi / 12) - 1}`,
        scaleIndex: note.index,
        isRoot: note.index === 0,
      });
    }
  });
  return out;
}

export interface PositionOptions {
  tuning?: Tuning;
  maxFret?: number;
  /** Trastes que abarca la mano sin estirarse. */
  span?: number;
  /** Permitir cuerdas al aire en las cajas bajas. */
  allowOpen?: boolean;
  /** Último traste donde se puede apoyar el índice. */
  maxBase?: number;
}

const DEFAULT_POSITION_OPTIONS: Required<PositionOptions> = {
  tuning: BARITONE,
  maxFret: 15,
  span: 4,
  allowOpen: true,
  // Un ciclo completo: en el traste 12 vuelve a empezar la caja del aire, así
  // que pasar de 11 solo repetiría las mismas formas doce trastes más arriba.
  maxBase: 11,
};

function fingerFor(fret: number, baseFret: number): number {
  if (fret === 0) return 0;
  const rel = fret - baseFret + 1;
  return Math.min(4, Math.max(1, rel));
}

/**
 * Recorrido ascendente de una caja: en cada cuerda se tocan las notas de
 * grave a aguda, y al pasar a la siguiente se arranca por encima de la
 * última nota tocada. Así el recorrido siempre sube y ninguna altura suena
 * dos veces.
 */
function buildPath(byString: PositionNote[][]): PositionNote[] {
  const path: PositionNote[] = [];
  let last = -Infinity;
  for (const notes of byString) {
    for (const note of notes) {
      if (note.midi <= last) continue;
      path.push(note);
      last = note.midi;
    }
  }
  return path;
}

function positionDifficulty(p: {
  span: number;
  baseFret: number;
  stretch: boolean;
  usesOpen: boolean;
}): number {
  let value = 1;
  if (p.span > 3) value += (p.span - 3) * 0.8;
  if (p.stretch) value += 1;
  if (p.baseFret > 5) value += (p.baseFret - 5) * 0.15;
  if (p.usesOpen) value -= 0.4;
  return Math.max(0.5, Math.round(value * 10) / 10);
}

/** Conjunto de notas de una caja, como clave comparable. */
function noteKeySet(notes: PositionNote[]): Set<string> {
  return new Set(notes.map((n) => `${n.stringIdx}:${n.fret}`));
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size > b.size) return false;
  for (const key of a) if (!b.has(key)) return false;
  return true;
}

/**
 * Cajas para puntear la escala sin mover la mano.
 *
 * Una caja se ancla en una nota de la escala sobre la cuerda más grave (por
 * eso una escala de 5 notas da 5 cajas y una de 7 da 7) y abarca los trastes
 * que cubren los cuatro dedos. Se descartan las que dejan una cuerda muda,
 * las que no llegan a una octava y las que están contenidas en otra.
 */
export function generatePositions(
  scale: Scale,
  options: PositionOptions = {},
): ScalePosition[] {
  const opts = { ...DEFAULT_POSITION_OPTIONS, ...options };
  const { tuning, span, maxFret, allowOpen, maxBase } = opts;
  const all = fretboardNotes(scale, tuning, maxFret);

  // Anclajes: la posición al aire más cada nota de la escala en la 4ª cuerda.
  const anchors = new Set<number>([0]);
  for (const note of all) {
    if (note.stringIdx === 0 && note.fret >= 1 && note.fret <= Math.min(maxBase, maxFret - span + 1)) {
      anchors.add(note.fret);
    }
  }

  const results: ScalePosition[] = [];

  for (const baseFret of [...anchors].sort((a, b) => a - b)) {
    // En la posición al aire la mano abarca del traste 1 al 4 y suma las
    // cuerdas sueltas; más arriba, los cuatro dedos desde el traste base.
    const open = baseFret === 0;
    const low = open ? 1 : baseFret;
    const top = low + span - 1;
    const openOk = allowOpen && baseFret <= 2;

    const byString: PositionNote[][] = tuning.strings.map((_, stringIdx) =>
      all
        .filter(
          (n) =>
            n.stringIdx === stringIdx &&
            ((n.fret >= low && n.fret <= top) || (n.fret === 0 && openOk)),
        )
        .sort((a, b) => a.fret - b.fret)
        .map((n) => ({ ...n, finger: fingerFor(n.fret, low) })),
    );

    // Una caja con una cuerda muda no sirve para puntear con fluidez.
    if (byString.some((notes) => notes.length === 0)) continue;

    const path = buildPath(byString);
    if (path.length < 5) continue;
    const range = path[path.length - 1].midi - path[0].midi;
    if (range < 12) continue; // menos de una octava: no es una caja, es un fragmento

    const fretted = path.filter((n) => n.fret > 0).map((n) => n.fret);
    const minFret = fretted.length ? Math.min(...fretted) : 0;
    const maxUsed = fretted.length ? Math.max(...fretted) : 0;
    const realSpan = fretted.length ? maxUsed - minFret + 1 : 0;
    const usesOpen = path.some((n) => n.fret === 0);
    const stretch = realSpan > 4;

    results.push({
      id: `pos-${baseFret}`,
      baseFret,
      span: realSpan,
      byString,
      path,
      noteCount: path.length,
      rootCount: path.filter((n) => n.isRoot).length,
      range,
      usesOpen,
      stretch,
      difficulty: positionDifficulty({ span: realSpan, baseFret, stretch, usesOpen }),
      label: "",
      startDegree: path[0].degree,
    });
  }

  // Si una caja toca un subconjunto de las notas de otra, la grande manda:
  // tocar la chica es tocar la grande a medias.
  const sets = results.map((position) => noteKeySet(position.path));
  const unique = results.filter((_, i) =>
    !results.some((_, j) => j !== i && isSubset(sets[i], sets[j]) && (sets[i].size < sets[j].size || j < i)),
  );

  unique.sort((a, b) => a.baseFret - b.baseFret);
  unique.forEach((position, idx) => {
    position.id = `caja-${idx + 1}`;
    position.label =
      position.baseFret === 0
        ? `Caja ${idx + 1} · al aire`
        : `Caja ${idx + 1} · traste ${position.baseFret}`;
  });
  return unique;
}

/**
 * Patrones de tres notas por cuerda: cada cuerda toma tres grados
 * consecutivos de la escala. Solo tiene sentido en escalas de 7 u 8 notas;
 * se descartan los patrones que no entran en la mano.
 */
export function threeNotesPerString(
  scale: Scale,
  options: PositionOptions = {},
): ScalePosition[] {
  const opts = { ...DEFAULT_POSITION_OPTIONS, ...options };
  const { tuning, maxFret } = opts;
  if (scale.notes.length < 7) return [];

  const results: ScalePosition[] = [];
  const seen = new Set<string>();

  for (let start = 0; start < scale.notes.length; start++) {
    // Altura de arranque: la más grave de ese grado en la cuerda 1
    const openLow = tuning.strings[0];
    const targetPc = scale.notes[start].pc;
    let firstMidi = -1;
    for (let fret = 0; fret <= 12; fret++) {
      if (midiToPc(openLow + fret) === targetPc) {
        firstMidi = openLow + fret;
        break;
      }
    }
    if (firstMidi < 0) continue;

    // Alturas ascendentes de la escala desde ahí
    const total = tuning.strings.length * 3;
    const pitches: Midi[] = [firstMidi];
    let index = start;
    let octave = 0;
    while (pitches.length < total) {
      const prevSemis = scale.notes[index].semitones + octave * 12;
      index = (index + 1) % scale.notes.length;
      if (index === 0) octave += 1;
      const nextSemis = scale.notes[index].semitones + octave * 12;
      pitches.push(pitches[pitches.length - 1] + (nextSemis - prevSemis));
    }

    const byString: PositionNote[][] = [];
    let feasible = true;
    for (let stringIdx = 0; stringIdx < tuning.strings.length && feasible; stringIdx++) {
      const open = tuning.strings[stringIdx];
      const chunk = pitches.slice(stringIdx * 3, stringIdx * 3 + 3);
      const frets = chunk.map((midi) => midi - open);
      if (frets.some((f) => f < 0 || f > maxFret)) {
        feasible = false;
        break;
      }
      if (Math.max(...frets) - Math.min(...frets) > 4) {
        feasible = false;
        break;
      }
      const baseOfString = Math.min(...frets.filter((f) => f > 0));
      byString.push(
        chunk.map((midi, i) => {
          const note = degreeOf(scale, midiToPc(midi))!;
          return {
            stringIdx,
            fret: frets[i],
            midi,
            pc: midiToPc(midi),
            degree: note.degree,
            name: note.name,
            fullName: `${note.name}${Math.floor(midi / 12) - 1}`,
            scaleIndex: note.index,
            isRoot: note.index === 0,
            finger: fingerFor(frets[i], Number.isFinite(baseOfString) ? baseOfString : 1),
          };
        }),
      );
    }
    if (!feasible) continue;

    const path = byString.flat();
    const key = path.map((n) => `${n.stringIdx}:${n.fret}`).join(",");
    if (seen.has(key)) continue;
    seen.add(key);

    const fretted = path.filter((n) => n.fret > 0).map((n) => n.fret);
    const minFret = fretted.length ? Math.min(...fretted) : 0;
    const maxUsed = fretted.length ? Math.max(...fretted) : 0;
    const realSpan = fretted.length ? maxUsed - minFret + 1 : 0;

    results.push({
      id: `tres-${start}`,
      baseFret: minFret,
      span: realSpan,
      byString,
      path,
      noteCount: path.length,
      rootCount: path.filter((n) => n.isRoot).length,
      range: path[path.length - 1].midi - path[0].midi,
      usesOpen: path.some((n) => n.fret === 0),
      stretch: realSpan > 4,
      difficulty: positionDifficulty({
        span: realSpan,
        baseFret: minFret,
        stretch: realSpan > 4,
        usesOpen: path.some((n) => n.fret === 0),
      }),
      label: "",
      startDegree: path[0].degree,
    });
  }

  results.sort((a, b) => a.baseFret - b.baseFret);
  results.forEach((position, idx) => {
    position.id = `tres-${idx + 1}`;
    position.label = `3 por cuerda ${idx + 1} · traste ${position.baseFret}`;
  });
  return results;
}

/**
 * Recorrido "libre" de toda la escala por el mástil, de la nota más grave a
 * la más aguda, tomando siempre la posición más cómoda. Sirve para escuchar
 * la escala completa sin pensar en cajas.
 */
export function fullRangePath(
  scale: Scale,
  tuning: Tuning = BARITONE,
  maxFret = 12,
): PositionNote[] {
  const all = fretboardNotes(scale, tuning, maxFret);
  const byMidi = new Map<Midi, FretNote>();
  for (const note of all) {
    const current = byMidi.get(note.midi);
    // Ante la misma altura, preferimos la cuerda más aguda con el traste más
    // bajo: es lo que hace la mano cuando sube por el mástil.
    if (!current || note.fret < current.fret) byMidi.set(note.midi, note);
  }
  return [...byMidi.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, note]) => ({ ...note, finger: 0 }));
}

/** Notas de una octava de la escala desde una altura dada (para escuchar). */
export function octaveMidis(scale: Scale, fromMidi: Midi): Midi[] {
  return [...scale.notes.map((n) => fromMidi + n.semitones), fromMidi + 12];
}

/** Nombre con octava, respetando el deletreo de la escala. */
export function noteLabel(scale: Scale, midi: Midi): string {
  const note = degreeOf(scale, midiToPc(midi));
  if (!note) return midiName(midi, scale.useFlats);
  return `${note.name}${Math.floor(midi / 12) - 1}`;
}
