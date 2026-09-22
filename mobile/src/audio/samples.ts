/**
 * Muestras de cuerda de nylon (FluidR3, MIT): una cada tercera menor, de D3
 * a B5. Importarlas las mete en el paquete de la app, así que suenan sin red.
 */
import { Midi } from "@core/engine/notes";
import Ab3 from "../../assets/samples/nylon/Ab3.mp3";
import Ab4 from "../../assets/samples/nylon/Ab4.mp3";
import Ab5 from "../../assets/samples/nylon/Ab5.mp3";
import B3 from "../../assets/samples/nylon/B3.mp3";
import B4 from "../../assets/samples/nylon/B4.mp3";
import B5 from "../../assets/samples/nylon/B5.mp3";
import D3 from "../../assets/samples/nylon/D3.mp3";
import D4 from "../../assets/samples/nylon/D4.mp3";
import D5 from "../../assets/samples/nylon/D5.mp3";
import F3 from "../../assets/samples/nylon/F3.mp3";
import F4 from "../../assets/samples/nylon/F4.mp3";
import F5 from "../../assets/samples/nylon/F5.mp3";

export const SAMPLE_FILES: [Midi, number][] = [
  [50, D3],
  [53, F3],
  [56, Ab3],
  [59, B3],
  [62, D4],
  [65, F4],
  [68, Ab4],
  [71, B4],
  [74, D5],
  [77, F5],
  [80, Ab5],
  [83, B5],
];
