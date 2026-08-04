/**
 * Detección de altura por YIN (de Cheveigné & Kawahara, 2002).
 *
 * Es autocorrelación con dos correcciones que importan mucho en una cuerda
 * de nylon: la normalización acumulada, que evita que el algoritmo elija
 * siempre el retardo cero, y la interpolación parabólica, que da precisión
 * de fracción de muestra (sin ella el error en E4 sería de ~8 cents).
 *
 * Funciona sobre un buffer de audio crudo, así que se puede probar con
 * señales generadas: no hace falta un micrófono para saber si anda.
 */

export interface PitchResult {
  /** Frecuencia fundamental en Hz, o null si no hay un tono claro. */
  frequency: number | null;
  /** 0–1: qué tan periódica es la señal. Por debajo de ~0.8 no es una nota. */
  clarity: number;
  /** Nivel RMS de la señal (0–1). */
  level: number;
}

export interface PitchOptions {
  /** Frecuencia más grave que se busca. */
  minFrequency?: number;
  /** Frecuencia más aguda que se busca. */
  maxFrequency?: number;
  /**
   * Umbral de YIN: el primer mínimo por debajo de este valor gana.
   * Más bajo = más exigente (menos falsos positivos, más silencios).
   */
  threshold?: number;
  /** RMS mínimo para molestarse en analizar. */
  minLevel?: number;
}

export const DEFAULT_PITCH_OPTIONS: Required<PitchOptions> = {
  // El barítono va de D3 (146,8 Hz) a E4 (329,6 Hz). El rango es más ancho
  // para tolerar cuerdas muy desafinadas y afinaciones alternativas.
  minFrequency: 60,
  maxFrequency: 1200,
  threshold: 0.15,
  minLevel: 0.008,
};

/** Cuando ningún mínimo baja del umbral, se acepta el mejor si al menos llega acá. */
const FALLBACK_LIMIT = 0.55;

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  options: PitchOptions = {},
): PitchResult {
  const opts = { ...DEFAULT_PITCH_OPTIONS, ...options };

  // Nivel: se mide sin la componente continua, que algunas placas meten
  // y que no aporta nada al tono.
  let mean = 0;
  for (let i = 0; i < buffer.length; i++) mean += buffer[i];
  mean /= buffer.length;
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    const value = buffer[i] - mean;
    sumSquares += value * value;
  }
  const level = Math.sqrt(sumSquares / buffer.length);
  if (level < opts.minLevel) return { frequency: null, clarity: 0, level };

  // La ventana de comparación es la mitad del buffer: así el retardo puede
  // llegar hasta la otra mitad sin salirse.
  const window = buffer.length >> 1;
  const tauMin = Math.max(2, Math.floor(sampleRate / opts.maxFrequency));
  const tauMax = Math.min(window - 1, Math.ceil(sampleRate / opts.minFrequency));
  if (tauMax <= tauMin) return { frequency: null, clarity: 0, level };

  // 1) Función de diferencia
  const yin = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < window; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yin[tau] = sum;
  }

  // 2) Diferencia media acumulada normalizada
  yin[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += yin[tau];
    yin[tau] = running === 0 ? 1 : (yin[tau] * tau) / running;
  }

  // 3) Primer mínimo por debajo del umbral (no el mínimo global: elegir el
  //    global hace que un armónico gane y la nota salga una octava abajo).
  let bestTau = -1;
  let tau = tauMin;
  while (tau <= tauMax) {
    if (yin[tau] < opts.threshold) {
      while (tau + 1 <= tauMax && yin[tau + 1] < yin[tau]) tau++;
      bestTau = tau;
      break;
    }
    tau++;
  }
  if (bestTau < 0) {
    // Nada bajó del umbral: se acepta el mejor candidato solo si es decente.
    let min = Infinity;
    for (let t = tauMin; t <= tauMax; t++) {
      if (yin[t] < min) {
        min = yin[t];
        bestTau = t;
      }
    }
    if (bestTau < 0 || min > FALLBACK_LIMIT) {
      return { frequency: null, clarity: 0, level };
    }
  }

  // 4) Interpolación parabólica alrededor del mínimo
  let refined = bestTau;
  if (bestTau > tauMin && bestTau < tauMax) {
    const s0 = yin[bestTau - 1];
    const s1 = yin[bestTau];
    const s2 = yin[bestTau + 1];
    const denominator = 2 * (2 * s1 - s2 - s0);
    if (denominator !== 0) {
      const shift = (s2 - s0) / denominator;
      // Un desplazamiento mayor a media muestra significa que el mínimo no
      // era tal: se queda con el entero.
      if (Math.abs(shift) < 1) refined = bestTau + shift;
    }
  }

  const frequency = sampleRate / refined;
  if (frequency < opts.minFrequency || frequency > opts.maxFrequency) {
    return { frequency: null, clarity: 0, level };
  }
  return {
    frequency,
    clarity: Math.max(0, Math.min(1, 1 - yin[bestTau])),
    level,
  };
}

/**
 * Mediana de las últimas lecturas.
 *
 * Una sola lectura puede irse una octava cuando la púa recién ataca la
 * cuerda; la mediana descarta esos saltos sin agregar retardo perceptible.
 */
export function medianFrequency(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Historial corto de frecuencias con salida estable.
 *
 * Devuelve un valor solo cuando las lecturas coinciden entre sí: mientras la
 * cuerda todavía no se estabilizó, el afinador no muestra números que bailan.
 */
export class PitchTracker {
  private readonly history: number[] = [];

  constructor(
    private readonly size = 5,
    /** Máxima dispersión tolerada, en cents, para dar por buena la lectura. */
    private readonly toleranceCents = 45,
  ) {}

  push(frequency: number | null): number | null {
    if (frequency === null) {
      this.history.length = 0;
      return null;
    }
    this.history.push(frequency);
    if (this.history.length > this.size) this.history.shift();
    if (this.history.length < Math.min(3, this.size)) return null;

    const median = medianFrequency(this.history)!;
    // Las lecturas que discrepan de la mediana (típicamente octavas) se
    // ignoran; si quedan muy pocas coincidentes, todavía no hay nota.
    const agree = this.history.filter(
      (f) => Math.abs(1200 * Math.log2(f / median)) < this.toleranceCents,
    );
    if (agree.length < Math.ceil(this.history.length / 2)) return null;
    return medianFrequency(agree);
  }

  reset(): void {
    this.history.length = 0;
  }
}
