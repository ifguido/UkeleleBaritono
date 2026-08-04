/**
 * Escalas: fórmulas por intervalos, deletreo correcto de las notas
 * y relaciones modales.
 *
 * Igual que con los acordes, acá no hay tablas de digitaciones: una escala
 * es una lista de intervalos desde la tónica, y todo lo demás (notas,
 * posiciones, acordes que salen de ella) se calcula.
 */

import { PitchClass, parseNoteName, pcName } from "./notes";

export type ScaleFamily =
  | "mayor"
  | "pentatonica"
  | "armonica"
  | "melodica"
  | "simetrica"
  | "bebop"
  | "caracter";

export const FAMILY_LABELS: Record<ScaleFamily, string> = {
  mayor: "Mayor y sus modos",
  pentatonica: "Pentatónicas y blues",
  armonica: "Menor armónica y sus modos",
  melodica: "Menor melódica y sus modos",
  simetrica: "Simétricas",
  bebop: "Bebop (8 notas)",
  caracter: "De carácter",
};

export const FAMILY_ORDER: ScaleFamily[] = [
  "pentatonica",
  "mayor",
  "armonica",
  "melodica",
  "bebop",
  "simetrica",
  "caracter",
];

export interface ScaleDegreeDef {
  /** Semitonos desde la tónica (0–11). */
  semitones: number;
  /** Etiqueta del grado: "1", "b3", "#4", "b9"… */
  label: string;
}

export interface ScaleFormula {
  id: string;
  name: string;
  /** Nombres alternativos, para buscar y para mostrar. */
  aliases: string[];
  family: ScaleFamily;
  degrees: ScaleDegreeDef[];
  /** Cómo suena. */
  character: string;
  /** Dónde se usa. */
  usage: string;
  /** Calidad de FORMULAS que mejor la representa (su "acorde casa"). */
  homeQuality: string;
  /** Es el modo Nº `degree` (1-based) de la escala `parent`. */
  mode?: { parent: string; degree: number };
}

function d(spec: [number, string][]): ScaleDegreeDef[] {
  return spec.map(([semitones, label]) => ({ semitones, label }));
}

function s(
  id: string,
  name: string,
  aliases: string[],
  family: ScaleFamily,
  spec: [number, string][],
  homeQuality: string,
  character: string,
  usage: string,
  mode?: { parent: string; degree: number },
): ScaleFormula {
  return { id, name, aliases, family, degrees: d(spec), homeQuality, character, usage, mode };
}

/** Catálogo. El orden dentro de cada familia es el orden de aparición. */
export const SCALES: Record<string, ScaleFormula> = {
  // ── Pentatónicas y blues ──────────────────────────────────────────────
  pentatonicMinor: s(
    "pentatonicMinor",
    "Pentatónica menor",
    ["pentatonica menor", "menor pentatonica", "minor pentatonic"],
    "pentatonica",
    [[0, "1"], [3, "b3"], [5, "4"], [7, "5"], [10, "b7"]],
    "m7",
    "La escala más agradecida del mundo: sin semitonos, no hay nota que suene mal.",
    "Rock, blues, folk, pop. Es la primera escala para puntear solos y la base de todo lo demás.",
  ),
  bluesMinor: s(
    "bluesMinor",
    "Blues menor",
    ["blues", "escala de blues", "hexatonica de blues", "blues scale"],
    "pentatonica",
    [[0, "1"], [3, "b3"], [5, "4"], [6, "b5"], [7, "5"], [10, "b7"]],
    "7",
    "La pentatónica menor más la blue note (b5): tensión sucia que pide resolver.",
    "Blues, rock, funk. La b5 es de paso: se toca yendo del 4 al 5 (o al revés), no se aguanta.",
  ),
  pentatonicMajor: s(
    "pentatonicMajor",
    "Pentatónica mayor",
    ["pentatonica mayor", "major pentatonic"],
    "pentatonica",
    [[0, "1"], [2, "2"], [4, "3"], [7, "5"], [9, "6"]],
    "major",
    "Luminosa y abierta. La mayor sin la 4ª ni la 7ª, que son las que rozan.",
    "Country, folk, pop, gospel. Sobre acordes mayores no falla nunca.",
  ),
  bluesMajor: s(
    "bluesMajor",
    "Blues mayor",
    ["blues mayor", "major blues"],
    "pentatonica",
    [[0, "1"], [2, "2"], [3, "b3"], [4, "3"], [7, "5"], [9, "6"]],
    "7",
    "Pentatónica mayor con la b3 metida al lado de la 3ª: ese roce es el sonido country-blues.",
    "Blues alegre, country, rockabilly. El truco es b3 → 3 ligado, nunca la b3 sola.",
    { parent: "bluesMinor", degree: 2 },
  ),
  bluesComposite: s(
    "bluesComposite",
    "Blues compuesta",
    ["blues completa", "blues mixta", "9 notas"],
    "pentatonica",
    [
      [0, "1"], [2, "2"], [3, "b3"], [4, "3"], [5, "4"],
      [6, "b5"], [7, "5"], [9, "6"], [10, "b7"],
    ],
    "7",
    "Blues mayor y blues menor juntas: nueve notas, todo el vocabulario del blues en un mapa.",
    "Para improvisar sobre un blues entero sin cambiar de escala. Mandan la 3ª y la b3 alternadas.",
  ),
  suspendedPentatonic: s(
    "suspendedPentatonic",
    "Pentatónica suspendida",
    ["egipcia", "sus pentatonic", "pentatonica sus"],
    "pentatonica",
    [[0, "1"], [2, "2"], [5, "4"], [7, "5"], [10, "b7"]],
    "7sus4",
    "Ni mayor ni menor: sin 3ª, queda flotando.",
    "Sobre acordes sus4 y vamps modales. Muy usada en rock progresivo y en folk.",
    { parent: "pentatonicMajor", degree: 2 },
  ),

  // ── Mayor y sus modos ─────────────────────────────────────────────────
  major: s(
    "major",
    "Mayor (jónico)",
    ["jonico", "ionian", "escala mayor", "do re mi"],
    "mayor",
    [[0, "1"], [2, "2"], [4, "3"], [5, "4"], [7, "5"], [9, "6"], [11, "7"]],
    "maj7",
    "La referencia: todo lo demás se describe como una alteración de ésta.",
    "Pop, folk, clásica. Sobre el I de una tonalidad mayor. Ojo con apoyarse en la 4ª.",
  ),
  dorian: s(
    "dorian",
    "Dórico",
    ["dorico", "dorian"],
    "mayor",
    [[0, "1"], [2, "2"], [3, "b3"], [5, "4"], [7, "5"], [9, "6"], [10, "b7"]],
    "m7",
    "Menor pero con la 6ª mayor: menos triste, más elegante.",
    "Funk, jazz modal, rock. Sobre m7 que no resuelve. La 6ª es la nota que hay que hacer sonar.",
    { parent: "major", degree: 2 },
  ),
  phrygian: s(
    "phrygian",
    "Frigio",
    ["frigio", "phrygian"],
    "mayor",
    [[0, "1"], [1, "b2"], [3, "b3"], [5, "4"], [7, "5"], [8, "b6"], [10, "b7"]],
    "m7",
    "Menor con la b2: oscuro, con aire español y tensión permanente.",
    "Metal, flamenco, música modal. La b2 justo arriba de la tónica es todo el color.",
    { parent: "major", degree: 3 },
  ),
  lydian: s(
    "lydian",
    "Lidio",
    ["lidio", "lydian"],
    "mayor",
    [[0, "1"], [2, "2"], [4, "3"], [6, "#4"], [7, "5"], [9, "6"], [11, "7"]],
    "maj7#11",
    "Mayor con la 4ª aumentada: suena a cine, a asombro, a algo que se abre.",
    "Bandas de sonido, jazz, pop soñador. Sobre maj7 que hace de IV o que no resuelve.",
    { parent: "major", degree: 4 },
  ),
  mixolydian: s(
    "mixolydian",
    "Mixolidio",
    ["mixolidio", "mixolydian"],
    "mayor",
    [[0, "1"], [2, "2"], [4, "3"], [5, "4"], [7, "5"], [9, "6"], [10, "b7"]],
    "7",
    "Mayor con la 7ª menor: alegre pero sin la tensión de resolver.",
    "Rock, blues, celta, funk. La escala natural de cualquier acorde de séptima dominante.",
    { parent: "major", degree: 5 },
  ),
  aeolian: s(
    "aeolian",
    "Menor natural (eólico)",
    ["menor natural", "eolico", "aeolian", "menor"],
    "mayor",
    [[0, "1"], [2, "2"], [3, "b3"], [5, "4"], [7, "5"], [8, "b6"], [10, "b7"]],
    "m7",
    "La menor de toda la vida: melancólica y estable.",
    "Rock, pop, baladas. Sobre el i de una tonalidad menor cuando el V no es dominante.",
    { parent: "major", degree: 6 },
  ),
  locrian: s(
    "locrian",
    "Locrio",
    ["locrio", "locrian"],
    "mayor",
    [[0, "1"], [1, "b2"], [3, "b3"], [5, "4"], [6, "b5"], [8, "b6"], [10, "b7"]],
    "m7b5",
    "Sin quinta justa no hay reposo: es una escala de paso, no de descanso.",
    "Sobre el iiø de un ii-V-i menor y en metal. Dura lo que dura ese acorde.",
    { parent: "major", degree: 7 },
  ),

  // ── Menor armónica y sus modos ────────────────────────────────────────
  harmonicMinor: s(
    "harmonicMinor",
    "Menor armónica",
    ["menor armonica", "harmonic minor"],
    "armonica",
    [[0, "1"], [2, "2"], [3, "b3"], [5, "4"], [7, "5"], [8, "b6"], [11, "7"]],
    "mMaj7",
    "Menor con sensible: el salto de segunda aumentada entre b6 y 7 le da el aire clásico/oriental.",
    "Cuando el V es dominante en tonalidad menor (Am con E7). Clásica, metal neoclásico, tango.",
  ),
  locrianNat6: s(
    "locrianNat6",
    "Locrio ♮6",
    ["locrio natural 6", "locrian nat6"],
    "armonica",
    [[0, "1"], [1, "b2"], [3, "b3"], [5, "4"], [6, "b5"], [9, "6"], [10, "b7"]],
    "m7b5",
    "Locrio con la 6ª mayor: menos asfixiante que el locrio común.",
    "Sobre el iiø cuando querés que respire un poco más.",
    { parent: "harmonicMinor", degree: 2 },
  ),
  romanianMinor: s(
    "romanianMinor",
    "Dórico #4 (rumano)",
    ["rumana", "ucraniana dorica", "dorico #4", "romanian minor"],
    "armonica",
    [[0, "1"], [2, "2"], [3, "b3"], [6, "#4"], [7, "5"], [9, "6"], [10, "b7"]],
    "m7",
    "Dórico con la 4ª aumentada: menor, exótico y con brillo.",
    "Klezmer, música de Europa del Este, jazz gitano. Sobre m7 o m6.",
    { parent: "harmonicMinor", degree: 4 },
  ),
  phrygianDominant: s(
    "phrygianDominant",
    "Frigio dominante",
    ["frigio mayor", "española", "phrygian dominant", "flamenca"],
    "armonica",
    [[0, "1"], [1, "b2"], [4, "3"], [5, "4"], [7, "5"], [8, "b6"], [10, "b7"]],
    "7b9",
    "Dominante con b9 y b13: el sonido flamenco por excelencia.",
    "Cadencia andaluza (Am–G–F–E), flamenco, metal, klezmer. Sobre cualquier V7 que va a menor.",
    { parent: "harmonicMinor", degree: 5 },
  ),

  // ── Menor melódica y sus modos ────────────────────────────────────────
  melodicMinor: s(
    "melodicMinor",
    "Menor melódica",
    ["menor melodica", "melodic minor", "menor jazz"],
    "melodica",
    [[0, "1"], [2, "2"], [3, "b3"], [5, "4"], [7, "5"], [9, "6"], [11, "7"]],
    "mMaj7",
    "Una mayor con la 3ª bemol: menor por abajo, mayor por arriba.",
    "Jazz sobre m(maj7) y m6. Es la madre de las escalas alteradas modernas.",
  ),
  lydianAugmented: s(
    "lydianAugmented",
    "Lidio aumentado",
    ["lidio #5", "lydian augmented"],
    "melodica",
    [[0, "1"], [2, "2"], [4, "3"], [6, "#4"], [8, "#5"], [9, "6"], [11, "7"]],
    "maj7#11",
    "Lidio con la quinta subida: flota, no toca el piso.",
    "Sobre maj7#5. Jazz moderno y pasajes suspendidos.",
    { parent: "melodicMinor", degree: 3 },
  ),
  lydianDominant: s(
    "lydianDominant",
    "Lidio b7 (lidio dominante)",
    ["lidio dominante", "lydian dominant", "mixolidio #11", "acustica"],
    "melodica",
    [[0, "1"], [2, "2"], [4, "3"], [6, "#4"], [7, "5"], [9, "6"], [10, "b7"]],
    "7#11",
    "Dominante con #11: brillante y moderna, sin la aspereza de la alterada.",
    "Sobre 7#11 y sobre dominantes que no resuelven (el bII7 del sub-V). Jazz, bossa.",
    { parent: "melodicMinor", degree: 4 },
  ),
  mixolydianb6: s(
    "mixolydianb6",
    "Mixolidio b6",
    ["mixolidio b13", "hindu", "mixolydian b6"],
    "melodica",
    [[0, "1"], [2, "2"], [4, "3"], [5, "4"], [7, "5"], [8, "b6"], [10, "b7"]],
    "7",
    "Dominante con b13: agridulce, con un pie en el modo menor.",
    "Sobre V7 que va a menor cuando no querés tanta tensión como la alterada.",
    { parent: "melodicMinor", degree: 5 },
  ),
  locrianNat2: s(
    "locrianNat2",
    "Locrio ♮2",
    ["semidisminuida", "locrian nat2", "locrio natural 2"],
    "melodica",
    [[0, "1"], [2, "2"], [3, "b3"], [5, "4"], [6, "b5"], [8, "b6"], [10, "b7"]],
    "m7b5",
    "El locrio utilizable: con la 9ª natural, el m7b5 deja de sonar a error.",
    "Es LA escala del iiø en un ii-V-i menor. Jazz.",
    { parent: "melodicMinor", degree: 6 },
  ),
  altered: s(
    "altered",
    "Alterada (superlocria)",
    ["alterada", "altered", "superlocria", "diminished whole tone"],
    "melodica",
    [[0, "1"], [1, "b9"], [3, "#9"], [4, "3"], [6, "b5"], [8, "#5"], [10, "b7"]],
    "7#9",
    "Toda la tensión posible sobre un dominante: b9, #9, b5 y #5 juntas.",
    "Sobre el V7 justo antes de resolver. Cuanto más fea suena sola, mejor resuelve.",
    { parent: "melodicMinor", degree: 7 },
  ),

  // ── Bebop ─────────────────────────────────────────────────────────────
  bebopDominant: s(
    "bebopDominant",
    "Bebop dominante",
    ["bebop dominante", "bebop dominant"],
    "bebop",
    [[0, "1"], [2, "2"], [4, "3"], [5, "4"], [7, "5"], [9, "6"], [10, "b7"], [11, "7"]],
    "7",
    "Mixolidio con la 7ª mayor de paso: ocho notas para que los acordes caigan en el tiempo fuerte.",
    "Jazz. Tocada en corcheas desde la tónica, las notas del acorde caen siempre a tiempo.",
  ),
  bebopMajor: s(
    "bebopMajor",
    "Bebop mayor",
    ["bebop mayor", "bebop major"],
    "bebop",
    [[0, "1"], [2, "2"], [4, "3"], [5, "4"], [7, "5"], [8, "b6"], [9, "6"], [11, "7"]],
    "maj7",
    "Mayor con la #5 de paso entre la 5ª y la 6ª.",
    "Jazz sobre maj7 y 6. Misma lógica rítmica que la bebop dominante.",
  ),
  bebopDorian: s(
    "bebopDorian",
    "Bebop dórico",
    ["bebop menor", "bebop dorian", "bebop minor"],
    "bebop",
    [[0, "1"], [2, "2"], [3, "b3"], [4, "3"], [5, "4"], [7, "5"], [9, "6"], [10, "b7"]],
    "m7",
    "Dórico con la 3ª mayor de paso: el mismo roce b3–3 del blues, en clave de jazz.",
    "Sobre m7 en ii-V-I. Enlaza la pentatónica menor con el lenguaje bebop.",
  ),

  // ── Simétricas ────────────────────────────────────────────────────────
  wholeTone: s(
    "wholeTone",
    "Tonos enteros",
    ["hexatonica", "whole tone", "por tonos"],
    "simetrica",
    [[0, "1"], [2, "2"], [4, "3"], [6, "#4"], [8, "#5"], [10, "b7"]],
    "7#5",
    "Todo a distancia de tono: no hay tónica, es una nube.",
    "Sobre 7#5 y 7b5. Debussy, cine, transiciones oníricas. Solo hay dos distintas.",
  ),
  diminishedWH: s(
    "diminishedWH",
    "Disminuida (tono-semitono)",
    ["disminuida", "diminished", "octatonica", "tono semitono"],
    "simetrica",
    [[0, "1"], [2, "2"], [3, "b3"], [5, "4"], [6, "b5"], [8, "b6"], [9, "6"], [11, "7"]],
    "dim7",
    "Tono y semitono alternados: simétrica, gira sobre sí misma cada 3 trastes.",
    "Sobre acordes dim7. Lo que aprendés en 3 trastes se repite en todo el mástil.",
  ),
  diminishedHW: s(
    "diminishedHW",
    "Disminuida (semitono-tono)",
    ["semitono tono", "half whole", "dominante disminuida"],
    "simetrica",
    [[0, "1"], [1, "b9"], [3, "#9"], [4, "3"], [6, "#11"], [7, "5"], [9, "13"], [10, "b7"]],
    "7b9",
    "La dominante con b9, #9 y #11 pero conservando la 5ª y la 13ª.",
    "Sobre 7b9 y 7#9. Alternativa a la alterada cuando querés mantener la 5ª justa.",
    { parent: "diminishedWH", degree: 2 },
  ),
  chromatic: s(
    "chromatic",
    "Cromática",
    ["cromatica", "chromatic", "todas las notas"],
    "simetrica",
    [
      [0, "1"], [1, "b2"], [2, "2"], [3, "b3"], [4, "3"], [5, "4"],
      [6, "b5"], [7, "5"], [8, "b6"], [9, "6"], [10, "b7"], [11, "7"],
    ],
    "7",
    "Las doce notas. No es una escala para improvisar: es el mapa completo del mástil.",
    "Para ejercitar dedos, para notas de aproximación y para ver dónde cae cada nota.",
  ),

  // ── De carácter ───────────────────────────────────────────────────────
  harmonicMajor: s(
    "harmonicMajor",
    "Mayor armónica",
    ["mayor armonica", "harmonic major"],
    "caracter",
    [[0, "1"], [2, "2"], [4, "3"], [5, "4"], [7, "5"], [8, "b6"], [11, "7"]],
    "maj7",
    "Mayor con la 6ª bemol: mayor por fuera, con una sombra adentro.",
    "Sobre maj7 cuando aparece el iv menor prestado. Jazz y música de cine.",
  ),
  hungarianMinor: s(
    "hungarianMinor",
    "Húngara menor (gitana)",
    ["gitana", "hungara", "hungarian minor", "gypsy"],
    "caracter",
    [[0, "1"], [2, "2"], [3, "b3"], [6, "#4"], [7, "5"], [8, "b6"], [11, "7"]],
    "mMaj7",
    "Dos segundas aumentadas: el sonido más dramático de todo el catálogo.",
    "Música gitana, klezmer, metal sinfónico. Sobre m(maj7) y sobre el i menor.",
  ),
  doubleHarmonic: s(
    "doubleHarmonic",
    "Doble armónica (bizantina)",
    ["bizantina", "arabe", "double harmonic", "gitana mayor"],
    "caracter",
    [[0, "1"], [1, "b2"], [4, "3"], [5, "4"], [7, "5"], [8, "b6"], [11, "7"]],
    "maj7",
    "Mayor con b2 y b6: simétrica, con dos segundas aumentadas alrededor de la 5ª.",
    "Música de Medio Oriente, surf, metal. Sobre acordes mayores con aire exótico.",
  ),
  neapolitanMinor: s(
    "neapolitanMinor",
    "Napolitana menor",
    ["napolitana", "neapolitan minor"],
    "caracter",
    [[0, "1"], [1, "b2"], [3, "b3"], [5, "4"], [7, "5"], [8, "b6"], [11, "7"]],
    "mMaj7",
    "Menor armónica con la b2: frigio con sensible.",
    "Clásica y metal neoclásico. Sobre el i menor con acorde napolitano (bII mayor).",
  ),
  hirajoshi: s(
    "hirajoshi",
    "Hirajoshi (japonesa)",
    ["japonesa", "hirajoshi"],
    "caracter",
    [[0, "1"], [2, "2"], [3, "b3"], [7, "5"], [8, "b6"]],
    "minor",
    "Pentatónica menor con b6 en vez de 4ª y b7: cinco notas, mucho aire entre ellas.",
    "Música japonesa, ambient, arreglos de koto. Los saltos grandes son el color.",
  ),
  inSen: s(
    "inSen",
    "In sen (japonesa)",
    ["in sen", "insen", "kokin joshi"],
    "caracter",
    [[0, "1"], [1, "b2"], [5, "4"], [7, "5"], [10, "b7"]],
    "7sus4",
    "Cinco notas con la b2: mínima y tensa a la vez.",
    "Música japonesa tradicional, minimalismo, bandas de sonido.",
  ),
};

export const SCALE_IDS = Object.keys(SCALES);

/** Escalas agrupadas por familia, en el orden de FAMILY_ORDER. */
export function scalesByFamily(): { family: ScaleFamily; label: string; scales: ScaleFormula[] }[] {
  return FAMILY_ORDER.map((family) => ({
    family,
    label: FAMILY_LABELS[family],
    scales: SCALE_IDS.map((id) => SCALES[id]).filter((f) => f.family === family),
  })).filter((g) => g.scales.length > 0);
}

// ── Deletreo de notas ───────────────────────────────────────────────────

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

/** "b3" → 2, "#4" → 3, "b9" → 1, "13" → 5 (posición diatónica 0-based). */
function degreeStep(label: string): number {
  const num = parseInt(label.replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(num) || num < 1) return 0;
  return (num - 1) % 7;
}

function accidentalText(diff: number): string {
  if (diff === 0) return "";
  if (diff === 1) return "#";
  if (diff === 2) return "##";
  if (diff === -1) return "b";
  if (diff === -2) return "bb";
  return "?";
}

/**
 * Deletrea un grado respetando la letra que le corresponde:
 * en C frigio dominante la b2 es Db (no C#), y la b7 es Bb.
 * Si haría falta más de un doble accidente, cae al nombre cromático.
 */
export function spellDegree(
  rootName: string,
  rootPc: PitchClass,
  degree: ScaleDegreeDef,
  useFlats: boolean,
): string {
  const targetPc = (rootPc + degree.semitones) % 12;
  const letterIdx = LETTERS.indexOf(rootName[0]?.toUpperCase() as (typeof LETTERS)[number]);
  if (letterIdx < 0) return pcName(targetPc, useFlats);

  const idx = (letterIdx + degreeStep(degree.label)) % 7;
  let diff = ((targetPc - LETTER_PC[idx]) % 12 + 12) % 12;
  if (diff > 6) diff -= 12;
  const acc = accidentalText(diff);
  if (acc === "?") return pcName(targetPc, useFlats);
  return LETTERS[idx] + acc;
}

// ── Escala instanciada ──────────────────────────────────────────────────

export interface ScaleNoteName {
  pc: PitchClass;
  /** Nombre deletreado ("Eb", "F#"). */
  name: string;
  /** Grado ("1", "b3"…). */
  degree: string;
  /** Semitonos desde la tónica. */
  semitones: number;
  /** Índice dentro de la escala (0 = tónica). */
  index: number;
}

export interface Scale {
  root: PitchClass;
  rootName: string;
  useFlats: boolean;
  formula: ScaleFormula;
  notes: ScaleNoteName[];
  pitchClasses: PitchClass[];
  pcSet: Set<PitchClass>;
  /** "C dórico". */
  name: string;
}

/** Tónicas que se escriben con bemol por convención. */
const DEFAULT_FLAT_ROOTS = new Set<PitchClass>([1, 3, 6, 8, 10]);

export function defaultRootName(pc: PitchClass): string {
  return pcName(pc, DEFAULT_FLAT_ROOTS.has(pc));
}

export function buildScale(rootName: string, formulaId: string): Scale | null {
  const root = parseNoteName(rootName);
  const formula = SCALES[formulaId];
  if (root === null || !formula) return null;
  const useFlats = rootName.includes("b") || rootName.includes("♭");
  const notes: ScaleNoteName[] = formula.degrees.map((degree, index) => ({
    pc: (root + degree.semitones) % 12,
    name: spellDegree(rootName, root, degree, useFlats),
    degree: degree.label,
    semitones: degree.semitones,
    index,
  }));
  const pitchClasses = notes.map((n) => n.pc);
  return {
    root,
    rootName: rootName.replace("♯", "#").replace("♭", "b"),
    useFlats,
    formula,
    notes,
    pitchClasses,
    pcSet: new Set(pitchClasses),
    name: `${rootName.replace("♯", "#").replace("♭", "b")} ${formula.name.toLowerCase()}`,
  };
}

/** Grado de un pitch class dentro de la escala, o null si no pertenece. */
export function degreeOf(scale: Scale, pc: PitchClass): ScaleNoteName | null {
  return scale.notes.find((n) => n.pc === pc) ?? null;
}

// ── Búsqueda y parseo ───────────────────────────────────────────────────

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#b ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SOLFEGE_ROOTS: [RegExp, string][] = [
  [/^do(?![a-z])/i, "C"],
  [/^re(?![a-z])/i, "D"],
  [/^mi(?![a-z])/i, "E"],
  [/^fa(?![a-z])/i, "F"],
  [/^sol(?![a-z])/i, "G"],
  [/^la(?![a-z])/i, "A"],
  [/^si(?![a-z])/i, "B"],
];

/** Busca la fórmula que mejor coincide con un texto libre. */
export function findScaleFormula(query: string): ScaleFormula | null {
  const q = norm(query);
  if (!q) return null;
  let best: { formula: ScaleFormula; score: number } | null = null;
  for (const id of SCALE_IDS) {
    const formula = SCALES[id];
    const candidates = [formula.name, formula.id, ...formula.aliases].map(norm);
    for (const candidate of candidates) {
      let score = 0;
      if (candidate === q) score = 100;
      else if (candidate.startsWith(q)) score = 60 + q.length;
      else if (candidate.includes(q)) score = 30 + q.length;
      else if (q.includes(candidate)) score = 20 + candidate.length;
      if (score > 0 && (!best || score > best.score)) best = { formula, score };
    }
  }
  return best?.formula ?? null;
}

export interface ScaleParseResult {
  ok: boolean;
  scale?: Scale;
  message?: string;
}

/** "C dórico", "Do menor armónica", "F# blues", "Bb pentatónica mayor". */
export function parseScaleQuery(input: string): ScaleParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, message: "Escribí una escala, por ejemplo: A blues." };

  let rootName: string | null = null;
  let rest = raw;

  const letterMatch = /^([A-G])(#|b|♯|♭)?(?![a-z])/.exec(raw);
  if (letterMatch) {
    rootName = letterMatch[1] + (letterMatch[2] ?? "").replace("♯", "#").replace("♭", "b");
    rest = raw.slice(letterMatch[0].length);
  } else {
    for (const [re, letter] of SOLFEGE_ROOTS) {
      const m = re.exec(raw);
      if (!m) continue;
      const after = raw.slice(m[0].length);
      const accidental = /^\s*(#|b|♯|♭)/.exec(after);
      rootName = letter + (accidental ? accidental[1].replace("♯", "#").replace("♭", "b") : "");
      rest = accidental ? after.slice(accidental[0].length) : after;
      break;
    }
  }

  if (!rootName) {
    return { ok: false, message: `No reconozco la tónica en "${raw}". Empezá con una nota A–G (o Do–Si).` };
  }

  const formula = rest.trim() ? findScaleFormula(rest) : SCALES.major;
  if (!formula) {
    return {
      ok: false,
      message: `No conozco la escala "${rest.trim()}". Probá: mayor, menor, blues, dórico, pentatónica menor, alterada…`,
    };
  }
  const scale = buildScale(rootName, formula.id);
  if (!scale) return { ok: false, message: `No pude construir "${raw}".` };
  return { ok: true, scale };
}

// ── Relaciones entre escalas ────────────────────────────────────────────

export interface RelatedScale {
  /** Cómo se relaciona: "modo", "paralela", "padre", "relativa". */
  kind: "padre" | "modo" | "paralela" | "relativa";
  rootName: string;
  formula: ScaleFormula;
  /** Explicación corta: "mismas notas, empezando por el 2º grado". */
  note: string;
}

const ORDINALS = ["", "1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º"];

/** Tónica de la escala padre que contiene exactamente estas notas. */
export function parentRootOf(scale: Scale): { rootName: string; formula: ScaleFormula } | null {
  const mode = scale.formula.mode;
  if (!mode) return null;
  const parent = SCALES[mode.parent];
  if (!parent || mode.degree < 1 || mode.degree > parent.degrees.length) return null;
  const offset = parent.degrees[mode.degree - 1].semitones;
  const parentPc = ((scale.root - offset) % 12 + 12) % 12;
  return { rootName: defaultRootName(parentPc), formula: parent };
}

/**
 * Escalas con exactamente las mismas notas (los modos hermanos), la paralela
 * mayor/menor y la relativa. Es la forma más rápida de entender una escala:
 * ver qué otra cosa que ya sabés tocar tiene las mismas notas.
 */
export function relatedScales(scale: Scale): RelatedScale[] {
  const out: RelatedScale[] = [];
  const parent = parentRootOf(scale);

  if (parent) {
    out.push({
      kind: "padre",
      rootName: parent.rootName,
      formula: parent.formula,
      note: `Mismas notas: es el ${ORDINALS[scale.formula.mode!.degree]} modo de ${parent.rootName} ${parent.formula.name.toLowerCase()}.`,
    });
  }

  // Modos hermanos: misma escala padre, otra tónica
  const parentId = scale.formula.mode?.parent ?? scale.formula.id;
  const parentRootName = parent?.rootName ?? scale.rootName;
  const parentFormula = SCALES[parentId];
  if (parentFormula) {
    const parentPc = parseNoteName(parentRootName);
    for (const id of SCALE_IDS) {
      const sibling = SCALES[id];
      if (sibling.id === scale.formula.id) continue;
      if (sibling.mode?.parent !== parentId) continue;
      if (parentPc === null) continue;
      const offset = parentFormula.degrees[sibling.mode.degree - 1]?.semitones;
      if (offset === undefined) continue;
      out.push({
        kind: "modo",
        rootName: defaultRootName((parentPc + offset) % 12),
        formula: sibling,
        note: `Mismas notas desde el ${ORDINALS[sibling.mode.degree]} grado.`,
      });
    }
  }

  // Paralela: misma tónica, la otra cara de la moneda
  const parallels: Record<string, string> = {
    major: "aeolian",
    aeolian: "major",
    pentatonicMajor: "pentatonicMinor",
    pentatonicMinor: "pentatonicMajor",
    bluesMinor: "bluesMajor",
    bluesMajor: "bluesMinor",
    dorian: "aeolian",
    mixolydian: "major",
    harmonicMinor: "melodicMinor",
    melodicMinor: "harmonicMinor",
  };
  const parallelId = parallels[scale.formula.id];
  if (parallelId && SCALES[parallelId]) {
    out.push({
      kind: "paralela",
      rootName: scale.rootName,
      formula: SCALES[parallelId],
      note: "Misma tónica, otro color. Cambiá entre las dos sin moverte de lugar.",
    });
  }

  return out;
}
