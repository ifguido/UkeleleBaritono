import { ScaleFormula } from "@/lib/engine/scales";
import { NOTE_BY_PC, NoteMeta } from "./slugs";

const DO = NOTE_BY_PC.get(0)!;
const LA = NOTE_BY_PC.get(9)!;

/**
 * Tónica con la que se muestra una escala en los índices.
 *
 * Las 12 tonalidades existen como página, pero en un listado hay que elegir
 * una, y conviene que sea la que la gente escribe en el buscador. Nadie busca
 * "pentatónica de Do": se busca "pentatónica de La". La regla es sencilla —las
 * escalas de color menor van en La y el resto en Do— y coincide con la
 * tonalidad en la que se enseña cada una.
 */
export function featuredRootFor(formula: ScaleFormula): NoteMeta {
  const minorFlavoured =
    formula.family === "pentatonica" ||
    formula.homeQuality.startsWith("m") ||
    formula.name.toLowerCase().includes("menor");
  return minorFlavoured ? LA : DO;
}

/**
 * Escala que mejor acompaña a cada cualidad de acorde, para enlazar la página
 * del acorde con la de la escala sobre la misma fundamental.
 *
 * No es un capricho de enlazado interno: quien busca cómo tocar un Mi7 casi
 * siempre está por improvisar encima, y el modo mixolidio es la respuesta a la
 * pregunta que venía después. Lo que no está en la tabla cae en la mayor.
 */
const SCALE_FOR_QUALITY: Record<string, string> = {
  major: "major",
  maj7: "major",
  maj9: "major",
  "6": "major",
  add9: "major",
  minor: "aeolian",
  m7: "dorian",
  m9: "dorian",
  m11: "dorian",
  m6: "melodicMinor",
  madd9: "aeolian",
  mMaj7: "harmonicMinor",
  "7": "mixolydian",
  "9": "mixolydian",
  "11": "mixolydian",
  "13": "mixolydian",
  "7sus4": "mixolydian",
  "9sus4": "mixolydian",
  m7b5: "locrian",
  dim: "diminishedHW",
  dim7: "diminishedHW",
  aug: "wholeTone",
  "7b9": "phrygianDominant",
  "13b9": "phrygianDominant",
  "7#9": "altered",
  "7#5": "altered",
  "7b5": "lydianDominant",
  "7#11": "lydianDominant",
  "maj7#11": "lydian",
  sus2: "major",
  sus4: "mixolydian",
  "5": "pentatonicMinor",
  "69": "pentatonicMajor",
  add4: "major",
  add11: "major",
};

export function relatedScaleIdFor(qualityId: string): string {
  return SCALE_FOR_QUALITY[qualityId] ?? "major";
}
