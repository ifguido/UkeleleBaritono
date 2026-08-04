/**
 * Cómo variar una escala: secuencias mecánicas (terceras, grupos de cuatro,
 * arpegios) y frases idiomáticas.
 *
 * Las secuencias se calculan sobre el recorrido real de una caja, así que
 * cada nota que suena es una nota que la mano puede tocar sin moverse.
 */

import { Midi, Tuning, BARITONE, midiToPc } from "./notes";
import { Scale, degreeOf } from "./scales";
import { PositionNote, ScalePosition, fretboardNotes } from "./scale-fretboard";

// ── Secuencias mecánicas ────────────────────────────────────────────────

export interface PatternContext {
  length: number;
  /** Índices del recorrido donde cae la tónica. */
  rootIndices: number[];
}

export interface Pattern {
  id: string;
  name: string;
  note: string;
  /** Notas por pulso sugeridas al reproducir. */
  grouping: number;
  build: (ctx: PatternContext) => number[];
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function pairs(length: number, step: number, descending = false): number[] {
  const out: number[] = [];
  for (let i = 0; i + step < length; i++) out.push(i, i + step);
  return descending ? out.reverse() : out;
}

function groups(length: number, size: number, descending = false): number[] {
  const out: number[] = [];
  for (let i = 0; i + size <= length; i++) {
    const chunk = range(size).map((k) => i + k);
    out.push(...(descending ? chunk.reverse() : chunk));
  }
  return out;
}

export const PATTERNS: Pattern[] = [
  {
    id: "up",
    name: "Ascendente",
    note: "La caja de punta a punta. Es la que hay que tener automatizada antes que ninguna.",
    grouping: 2,
    build: ({ length }) => range(length),
  },
  {
    id: "down",
    name: "Descendente",
    note: "Bajar cuesta más que subir. Practicala tanto como la ascendente.",
    grouping: 2,
    build: ({ length }) => range(length).reverse(),
  },
  {
    id: "upDown",
    name: "Ida y vuelta",
    note: "Sube y baja sin repetir la nota más aguda: el giro tiene que sonar parejo.",
    grouping: 2,
    build: ({ length }) => [...range(length), ...range(length - 1).reverse()],
  },
  {
    id: "thirds",
    name: "Terceras",
    note: "De a pares salteando una nota. Rompe el sonido de escala y empieza a sonar a melodía.",
    grouping: 2,
    build: ({ length }) => pairs(length, 2),
  },
  {
    id: "thirdsDown",
    name: "Terceras bajando",
    note: "El mismo patrón al revés. Muy usado para cerrar frases.",
    grouping: 2,
    build: ({ length }) => pairs(length, 2, true),
  },
  {
    id: "fourths",
    name: "Cuartas",
    note: "Saltos más grandes: suena moderno y obliga a controlar la púa o el pulgar.",
    grouping: 2,
    build: ({ length }) => pairs(length, 3),
  },
  {
    id: "groups3",
    name: "Grupos de 3",
    note: "Tres notas por pulso. Contra un 4/4 genera desplazamiento rítmico.",
    grouping: 3,
    build: ({ length }) => groups(length, 3),
  },
  {
    id: "groups4",
    name: "Grupos de 4",
    note: "El ejercicio clásico: 1234, 2345, 3456… Ordena la mano derecha.",
    grouping: 4,
    build: ({ length }) => groups(length, 4),
  },
  {
    id: "groups4Down",
    name: "Grupos de 4 bajando",
    note: "Cada grupo de cuatro se toca al revés mientras la frase avanza hacia arriba.",
    grouping: 4,
    build: ({ length }) => groups(length, 4, true),
  },
  {
    id: "triads",
    name: "Arpegios de la escala",
    note: "1-3-5 sobre cada grado: es la armonía de la escala tocada en línea.",
    grouping: 3,
    build: ({ length }) => {
      const out: number[] = [];
      for (let i = 0; i + 4 < length; i++) out.push(i, i + 2, i + 4);
      return out;
    },
  },
  {
    id: "pedal",
    name: "Pedal de tónica",
    note: "Cada nota alterna con la tónica. Ancla el oído y suena mucho más musical que una escala.",
    grouping: 2,
    build: ({ length, rootIndices }) => {
      const pedal = rootIndices.length ? rootIndices[0] : 0;
      const out: number[] = [];
      for (let i = 0; i < length; i++) {
        if (i === pedal) continue;
        out.push(pedal, i);
      }
      return out;
    },
  },
  {
    id: "zigzag",
    name: "Zigzag",
    note: "Un paso adelante y medio atrás: la escala deja de sonar a ejercicio.",
    grouping: 2,
    build: ({ length }) => {
      const out: number[] = [];
      for (let i = 0; i < length - 1; i++) out.push(i, i + 1, i);
      return out;
    },
  },
];

export interface RenderedSequence {
  notes: PositionNote[];
  /** Notas por pulso sugeridas. */
  grouping: number;
}

/** Aplica una secuencia al recorrido de una caja. */
export function applyPattern(position: ScalePosition, pattern: Pattern): RenderedSequence {
  const rootIndices = position.path
    .map((n, i) => (n.isRoot ? i : -1))
    .filter((i) => i >= 0);
  const indices = pattern.build({ length: position.path.length, rootIndices });
  return {
    notes: indices.filter((i) => i >= 0 && i < position.path.length).map((i) => position.path[i]),
    grouping: pattern.grouping,
  };
}

// ── Frases idiomáticas ──────────────────────────────────────────────────

export interface LickStep {
  degree: string;
  /** Octava relativa a la tónica de referencia. */
  octave: number;
}

export interface Lick {
  id: string;
  name: string;
  note: string;
  steps: LickStep[];
}

/** "b3" = octava base, "1'" = una octava arriba, "b7," = una abajo. */
function step(spec: string): LickStep {
  let octave = 0;
  let degree = spec;
  while (degree.endsWith("'") || degree.endsWith(",")) {
    octave += degree.endsWith("'") ? 1 : -1;
    degree = degree.slice(0, -1);
  }
  return { degree, octave };
}

function lick(id: string, name: string, note: string, specs: string[]): Lick {
  return { id, name, note, steps: specs.map(step) };
}

/**
 * Cada frase declara los grados que usa. Si la escala elegida no tiene
 * alguno, la frase simplemente no aparece: nunca se fuerza una nota que
 * no pertenece.
 */
export const LICKS: Lick[] = [
  lick(
    "blues-call",
    "Llamada de blues",
    "El giro más reconocible de la caja 1. Terminá siempre en la tónica y dejá aire.",
    ["1'", "b7", "5", "b7", "1'", "b3'", "1'"],
  ),
  lick(
    "blues-resolve",
    "Resolución al tónico",
    "Bajada corta para cerrar una frase. La b7 grave le da el peso.",
    ["4", "b3", "1", "b7,", "1"],
  ),
  lick(
    "blues-ladder",
    "Escalera con blue note",
    "La b5 pasa de largo entre el 4 y el 5. Si la dejás sonar, se cae.",
    ["1", "b3", "4", "b5", "5", "b7", "1'"],
  ),
  lick(
    "blues-b3-3",
    "Roce b3 → 3",
    "El corazón del blues mayor: la b3 nunca se queda quieta, resuelve a la 3ª.",
    ["1", "b3", "3", "5", "6", "1'"],
  ),
  lick(
    "blues-question",
    "Pregunta y respuesta",
    "Sube preguntando y baja contestando. Es una frase entera, no un ejercicio.",
    ["5", "b7", "1'", "b7", "5", "4", "b3", "1"],
  ),
  lick(
    "dorian-color",
    "El color dórico",
    "La 6ª mayor sobre un acorde menor: apoyate en ella y se escucha el modo.",
    ["1", "2", "b3", "5", "6", "5", "b3"],
  ),
  lick(
    "major-arp",
    "Arpegio con vecinas",
    "Notas del acorde con paso: suena a melodía, no a escala.",
    ["1", "2", "3", "5", "3", "2", "1"],
  ),
  lick(
    "lydian-leap",
    "Salto lidio",
    "Subí hasta la #4 y volvé. Esa nota sola ya cuenta la historia del modo.",
    ["1", "2", "3", "#4", "3", "2", "1"],
  ),
  lick(
    "mixo-enclosure",
    "Cerco sobre la 3ª",
    "Rodear la 3ª por arriba y por abajo antes de tocarla. Lenguaje de jazz aplicable a todo.",
    ["4", "2", "3", "5", "b7", "1'"],
  ),
  lick(
    "spanish-turn",
    "Giro español",
    "b2 sobre la tónica y bajada: flamenco puro. Funciona sobre el V7 de una menor.",
    ["1'", "b2'", "1'", "b7", "b6", "5"],
  ),
  lick(
    "leading-tone",
    "Cadencia con sensible",
    "La 7ª mayor tirando a la tónica es lo que distingue la menor armónica de la natural.",
    ["5", "b6", "7", "1'", "7", "b6", "5"],
  ),
  lick(
    "altered-drop",
    "Bajada alterada",
    "Toda la tensión en orden descendente. Resolvé medio tono abajo y suena impecable.",
    ["3", "#9", "b9", "1", "b7", "#5", "b5"],
  ),
  lick(
    "octave-anchor",
    "Tónica y quinta",
    "Cuatro notas para fijar el centro tonal antes de improvisar.",
    ["1", "5", "1'", "5", "1"],
  ),
];

/** Frases cuyos grados están todos en la escala. */
export function availableLicks(scale: Scale): Lick[] {
  const degrees = new Set(scale.notes.map((n) => n.degree));
  return LICKS.filter((l) => l.steps.every((s) => degrees.has(s.degree)));
}

/**
 * Baja la frase al diapasón cerca de una caja: para cada altura se elige
 * la cuerda/traste más cercana a la posición de la mano.
 */
export function renderLick(
  scale: Scale,
  lickDef: Lick,
  position: ScalePosition,
  tuning: Tuning = BARITONE,
  maxFret = 15,
): PositionNote[] {
  const anchor = position.path.find((n) => n.isRoot) ?? position.path[0];
  // Tónica de referencia: la más grave de la caja (o la que quede por debajo
  // de la primera nota si la caja no tiene tónica).
  const rootMidi = anchor.isRoot
    ? anchor.midi
    : anchor.midi - (((midiToPc(anchor.midi) - scale.root) % 12 + 12) % 12);

  const all = fretboardNotes(scale, tuning, maxFret);
  if (all.length === 0) return [];
  const lowest = Math.min(...all.map((n) => n.midi));
  const highest = Math.max(...all.map((n) => n.midi));

  const targets: { midi: Midi }[] = [];
  for (const s of lickDef.steps) {
    const note = scale.notes.find((n) => n.degree === s.degree);
    if (!note) return [];
    targets.push({ midi: rootMidi + note.semitones + s.octave * 12 });
  }

  // La frase entera se sube o baja octavas hasta que entre en el mástil:
  // moverla completa mantiene el dibujo melódico; mover notas sueltas no.
  let shift = 0;
  while (Math.min(...targets.map((t) => t.midi)) + shift < lowest) shift += 12;
  while (Math.max(...targets.map((t) => t.midi)) + shift > highest) shift -= 12;

  const out: PositionNote[] = [];
  for (const target of targets) {
    const midi = target.midi + shift;
    const candidates = all.filter((n) => n.midi === midi);
    if (candidates.length === 0) continue;
    // La más cómoda: la que cae más cerca del traste base de la caja.
    const best = candidates.reduce((a, b) =>
      Math.abs(b.fret - position.baseFret) < Math.abs(a.fret - position.baseFret) ? b : a,
    );
    out.push({
      ...best,
      finger: best.fret === 0 ? 0 : Math.min(4, Math.max(1, best.fret - position.baseFret + 1)),
    });
  }
  return out;
}

/** Alturas de una secuencia, para el audio. */
export function sequenceMidis(notes: PositionNote[]): Midi[] {
  return notes.map((n) => n.midi);
}

/** Nombre de grado de una altura dentro de la escala (para etiquetas). */
export function degreeAt(scale: Scale, midi: Midi): string {
  return degreeOf(scale, midiToPc(midi))?.degree ?? "";
}
