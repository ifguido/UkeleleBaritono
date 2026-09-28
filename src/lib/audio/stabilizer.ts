/**
 * Lo que convierte lecturas crudas en una aguja que se puede mirar.
 *
 * El detector entrega una frecuencia cada 40 ms, y cada una tiene su ruido:
 * unos cents de más o de menos, algún cuadro perdido cuando la cuerda se
 * apaga, una octava suelta en el ataque. Mostrarlas tal cual da una aguja
 * nerviosa que se cae al centro en cuanto un cuadro falla. Los afinadores que
 * se sienten bien (el de Google, los de pedal) hacen tres cosas:
 *
 * 1. Suavizan: la aguja sigue a la cuerda con una constante de tiempo de un
 *    par de décimas, más rápida si el desvío es grande (se está girando la
 *    clavija) y más lenta cuando está casi quieta (el temblor de ±2 cents no
 *    se ve).
 * 2. Saltan: si llega otra nota (otra cuerda), la aguja va directo, sin
 *    arrastrarse por el medio del dial.
 * 3. Sostienen: cuando la cuerda deja de sonar, la última lectura queda en
 *    pantalla un rato, atenuada, en vez de desaparecer.
 *
 * Y una cuarta, menos visible: cuando la cuerda se está apagando y su nivel
 * se acerca al ruido de fondo, el detector sigue dando notas "claras" pero
 * con errores de ±8 cents. Esas lecturas no mueven la aguja: se sostiene la
 * última buena. Para eso se estima el ruido de fondo sobre la marcha.
 */

import { PitchTracker } from "./pitch";

export interface StabilizerOptions {
  /** Si la señal se corta menos que esto, la historia de lecturas se conserva. */
  gapMs: number;
  /** Cuánto se sostiene la última lectura después de que la cuerda se calla. */
  holdMs: number;
  /** Sin lecturas nuevas por más de esto, la lectura se marca como sostenida. */
  freshMs: number;
  /** Constante de tiempo del suavizado con la aguja casi quieta. */
  slowMs: number;
  /** Constante de tiempo con desvíos grandes (clavija girando). */
  fastMs: number;
  /** Desvío, en cents, a partir del cual se usa la constante rápida. */
  fastAboveCents: number;
  /** Desvío, en cents, que se toma como nota nueva: la aguja salta. */
  jumpCents: number;
  /**
   * Relación señal/ruido mínima (en amplitud) para que una lectura mueva la
   * aguja. 10 son 20 dB: por debajo, el ruido ya corre la altura varios cents.
   */
  minSnr: number;
  /** Cuánto puede subir por segundo la estimación del ruido de fondo. */
  floorRisePerSecond: number;
}

export const DEFAULT_STABILIZER_OPTIONS: StabilizerOptions = {
  gapMs: 250,
  holdMs: 1500,
  freshMs: 150,
  slowMs: 220,
  fastMs: 90,
  fastAboveCents: 8,
  jumpCents: 70,
  minSnr: 10,
  floorRisePerSecond: 1.15,
};

/**
 * Arranque y límites del ruido de fondo. Se empieza bajo para que una cuerda
 * que ya está sonando al abrir el micrófono se lea igual; el techo evita que
 * un ambiente ruidoso deje al afinador sordo del todo.
 */
const INITIAL_FLOOR = 0.001;
const MIN_FLOOR = 0.00005;
const MAX_FLOOR = 0.004;
/** Constante de tiempo con la que se aprende el ruido en los cuadros sin nota. */
const FLOOR_LEARN_MS = 300;

export interface StableReading {
  /** Frecuencia suavizada. */
  frequency: number;
  /**
   * true si la lectura es de ahora; false si es la última que hubo y se está
   * sosteniendo mientras la cuerda se apaga.
   */
  fresh: boolean;
}

export class TunerStabilizer {
  private readonly options: StabilizerOptions;
  /** Mediana corta: descarta los saltos de octava del ataque. */
  private readonly tracker = new PitchTracker();
  private smoothed: number | null = null;
  /** Último cuadro con una frecuencia detectada. */
  private lastSignalAt = -Infinity;
  /** Última vez que la mediana dio una nota y la aguja se movió. */
  private lastUpdateAt = -Infinity;
  /** Ruido de fondo estimado (RMS). Baja al instante y sube despacio. */
  private floor = INITIAL_FLOOR;
  private lastFrameAt: number | null = null;

  constructor(options: Partial<StabilizerOptions> = {}) {
    this.options = { ...DEFAULT_STABILIZER_OPTIONS, ...options };
  }

  /**
   * Un cuadro de análisis. `frequency` es la del detector (null si no hubo
   * nota clara), `now` el reloj en milisegundos y `level` el RMS del cuadro
   * (sin él no se estima el ruido y toda lectura cuenta).
   */
  push(frequency: number | null, now: number, level?: number): StableReading | null {
    const o = this.options;
    const weak = level !== undefined && this.isWeak(level, frequency !== null, now);
    if (frequency !== null) {
      this.lastSignalAt = now;
      // Una lectura débil mantiene viva la nota pero no mueve la aguja.
      const candidate = weak ? null : this.tracker.push(frequency);
      if (candidate !== null) this.follow(candidate, now);
    } else if (now - this.lastSignalAt > o.gapMs) {
      // Un silencio de verdad, no un cuadro perdido: la próxima nota empieza
      // de cero y no se mezcla con restos de la anterior.
      this.tracker.reset();
    }

    if (this.smoothed === null) return null;
    const age = now - this.lastUpdateAt;
    if (age > o.holdMs) {
      this.smoothed = null;
      return null;
    }
    return { frequency: this.smoothed, fresh: age <= o.freshMs };
  }

  reset(): void {
    this.tracker.reset();
    this.smoothed = null;
    this.lastSignalAt = -Infinity;
    this.lastUpdateAt = -Infinity;
    this.floor = INITIAL_FLOOR;
    this.lastFrameAt = null;
  }

  /** Actualiza el ruido de fondo y dice si este cuadro está demasiado cerca. */
  private isWeak(level: number, pitched: boolean, now: number): boolean {
    const elapsed = this.lastFrameAt === null ? 0 : Math.max(0, now - this.lastFrameAt);
    this.lastFrameAt = now;
    if (level < this.floor) {
      // Baja de golpe apenas hay un cuadro más silencioso.
      this.floor = level;
    } else if (!pitched && level < this.floor * this.options.minSnr) {
      // Un cuadro sin nota y sin un golpe fuerte (el ataque de la púa
      // todavía no tiene altura clara) es ruido: se aprende rápido.
      this.floor += (level - this.floor) * (1 - Math.exp(-elapsed / FLOOR_LEARN_MS));
    } else {
      // Con una nota sonando, sube muy despacio: una nota larga no es ruido.
      this.floor *= Math.pow(this.options.floorRisePerSecond, elapsed / 1000);
    }
    this.floor = Math.min(Math.max(this.floor, MIN_FLOOR), MAX_FLOOR);
    return level < this.floor * this.options.minSnr;
  }

  private follow(candidate: number, now: number): void {
    const o = this.options;
    const previous = this.smoothed;
    const elapsed = now - this.lastUpdateAt;
    this.lastUpdateAt = now;

    // Sin lectura previa o ya vencida: la aguja arranca donde está la cuerda.
    if (previous === null || elapsed > o.holdMs) {
      this.smoothed = candidate;
      return;
    }
    const cents = 1200 * Math.log2(candidate / previous);
    if (Math.abs(cents) > o.jumpCents) {
      this.smoothed = candidate;
      return;
    }
    // Suavizado exponencial en cents, independiente del ritmo de cuadros.
    const tau = Math.abs(cents) > o.fastAboveCents ? o.fastMs : o.slowMs;
    const alpha = 1 - Math.exp(-Math.min(elapsed, 250) / tau);
    this.smoothed = previous * Math.pow(2, (alpha * cents) / 1200);
  }
}
