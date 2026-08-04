import { describe, expect, it } from "vitest";
import { DEFAULT_PITCH_OPTIONS, PitchTracker, detectPitch, medianFrequency } from "../../audio/pitch";
import {
  DEFAULT_A4,
  IN_TUNE_CENTS,
  centsBetween,
  frequencyToMidiFloat,
  instructionFor,
  midiToFrequency,
  nearestString,
  readNote,
  stringTargets,
  verdictFor,
} from "../tuning";
import { BARITONE } from "../notes";

const SAMPLE_RATE = 44100;
const SIZE = 4096;

/** Ruido reproducible: los tests no pueden depender de Math.random(). */
function noiseGenerator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return (state / 4294967296) * 2 - 1;
  };
}

interface ToneOptions {
  /** Amplitud relativa de cada armónico, empezando por el fundamental. */
  harmonics?: number[];
  /** Ruido blanco agregado, relativo a la amplitud. */
  noise?: number;
  /** Decaimiento exponencial, como el de una cuerda pulsada. */
  decay?: number;
  amplitude?: number;
  phase?: number;
}

/** Genera una señal periódica de frecuencia conocida. */
function tone(frequency: number, options: ToneOptions = {}): Float32Array {
  const {
    harmonics = [1],
    noise = 0,
    decay = 0,
    amplitude = 0.4,
    phase = 0.3,
  } = options;
  const random = noiseGenerator(Math.round(frequency * 1000) + 7);
  const buffer = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    const t = i / SAMPLE_RATE;
    let value = 0;
    harmonics.forEach((gain, index) => {
      value += gain * Math.sin(2 * Math.PI * frequency * (index + 1) * t + phase * (index + 1));
    });
    const envelope = decay > 0 ? Math.exp(-decay * t) : 1;
    buffer[i] = amplitude * envelope * value + noise * amplitude * random();
  }
  return buffer;
}

/** Error de detección en cents. */
function errorCents(detected: number | null, expected: number): number {
  if (detected === null) return Infinity;
  return Math.abs(centsBetween(detected, expected));
}

describe("detección de altura", () => {
  it("acierta las cuatro cuerdas al aire con menos de un cent de error", () => {
    for (const target of stringTargets(BARITONE)) {
      const result = detectPitch(tone(target.frequency), SAMPLE_RATE);
      expect(errorCents(result.frequency, target.frequency), target.fullName).toBeLessThan(1);
      expect(result.clarity).toBeGreaterThan(0.95);
    }
  });

  it("acierta en todo el rango del instrumento", () => {
    // De dos semitonos por debajo del D3 al traste 15 de la prima.
    for (let midi = 48; midi <= 79; midi++) {
      const expected = midiToFrequency(midi);
      const result = detectPitch(tone(expected), SAMPLE_RATE);
      expect(errorCents(result.frequency, expected), `midi ${midi}`).toBeLessThan(2);
    }
  });

  it("no se va de octava con una cuerda de nylon real", () => {
    // Una cuerda pulsada tiene armónicos fuertes y decae: es el caso donde la
    // autocorrelación simple contesta la octava equivocada.
    const timbre = [1, 0.62, 0.4, 0.28, 0.17, 0.1, 0.06];
    for (const target of stringTargets(BARITONE)) {
      const result = detectPitch(
        tone(target.frequency, { harmonics: timbre, decay: 2.2, noise: 0.03 }),
        SAMPLE_RATE,
      );
      expect(errorCents(result.frequency, target.frequency), target.fullName).toBeLessThan(5);
    }
  });

  it("aguanta un fundamental débil sin bajar una octava", () => {
    // En micrófonos chicos el fundamental casi no llega y manda el 2º armónico.
    const target = midiToFrequency(50); // D3
    const result = detectPitch(
      tone(target, { harmonics: [0.25, 1, 0.7, 0.45, 0.3], noise: 0.02 }),
      SAMPLE_RATE,
    );
    expect(errorCents(result.frequency, target)).toBeLessThan(5);
  });

  it("mide bien una cuerda desafinada, no la nota más cercana", () => {
    // 30 cents por encima de G3: el detector tiene que decir la frecuencia
    // real, no redondear a la nota.
    const target = midiToFrequency(55) * Math.pow(2, 30 / 1200);
    const result = detectPitch(tone(target, { harmonics: [1, 0.5, 0.3] }), SAMPLE_RATE);
    expect(errorCents(result.frequency, target)).toBeLessThan(3);
    expect(readNote(result.frequency!).fullName).toBe("G3");
    expect(readNote(result.frequency!).cents).toBeGreaterThan(25);
    expect(readNote(result.frequency!).cents).toBeLessThan(35);
  });

  it("no inventa notas en el silencio ni en el ruido", () => {
    const silence = new Float32Array(SIZE);
    expect(detectPitch(silence, SAMPLE_RATE).frequency).toBeNull();

    // Silencio con algo de ruido de fondo: sigue siendo silencio.
    const hiss = noiseGenerator(11);
    const quiet = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) quiet[i] = hiss() * 0.002;
    expect(detectPitch(quiet, SAMPLE_RATE).frequency).toBeNull();

    // Ruido fuerte: hay señal, pero no es periódica.
    const loud = new Float32Array(SIZE);
    const random = noiseGenerator(23);
    for (let i = 0; i < SIZE; i++) loud[i] = random() * 0.5;
    const result = detectPitch(loud, SAMPLE_RATE);
    expect(result.level).toBeGreaterThan(DEFAULT_PITCH_OPTIONS.minLevel);
    expect(result.clarity).toBeLessThan(0.8);
  });

  it("ignora lo que queda fuera del rango buscado", () => {
    const result = detectPitch(tone(2500), SAMPLE_RATE, { maxFrequency: 1200 });
    expect(errorCents(result.frequency, 2500)).toBeGreaterThan(50);
  });
});

describe("estabilización de la lectura", () => {
  it("la mediana descarta el salto de octava del ataque", () => {
    expect(medianFrequency([146.8, 293.6, 146.9, 146.8, 147.0])).toBeCloseTo(146.9, 1);
  });

  it("no muestra nada hasta que las lecturas coinciden", () => {
    const tracker = new PitchTracker();
    expect(tracker.push(146.8)).toBeNull(); // una sola lectura no alcanza
    expect(tracker.push(146.9)).toBeNull();
    const settled = tracker.push(146.8);
    expect(settled).not.toBeNull();
    expect(settled!).toBeCloseTo(146.8, 1);
  });

  it("un silencio borra el historial", () => {
    const tracker = new PitchTracker();
    tracker.push(146.8);
    tracker.push(146.8);
    tracker.push(146.8);
    expect(tracker.push(null)).toBeNull();
    expect(tracker.push(220)).toBeNull(); // arranca de cero, no promedia con lo viejo
  });

  it("una lectura suelta a la octava no arrastra el resultado", () => {
    const tracker = new PitchTracker();
    tracker.push(146.8);
    tracker.push(293.6); // la que se va de octava
    tracker.push(146.8);
    const settled = tracker.push(146.9);
    expect(settled).not.toBeNull();
    expect(errorCents(settled, 146.85)).toBeLessThan(5);
  });
});

describe("notas y cuerdas", () => {
  it("La4 = 440 Hz y el temperamento sale de ahí", () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(60)).toBeCloseTo(261.626, 2);
    expect(frequencyToMidiFloat(440)).toBeCloseTo(69, 6);
    expect(centsBetween(440, 440)).toBe(0);
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 6);
  });

  it("las cuerdas del barítono tienen las frecuencias que corresponden", () => {
    const targets = stringTargets(BARITONE);
    expect(targets.map((t) => t.fullName)).toEqual(["D3", "G3", "B3", "E4"]);
    expect(targets.map((t) => Math.round(t.frequency * 10) / 10)).toEqual([
      146.8, 196, 246.9, 329.6,
    ]);
  });

  it("cambiar la referencia mueve las cuatro cuerdas a la vez", () => {
    const en432 = stringTargets(BARITONE, 432);
    const en440 = stringTargets(BARITONE, DEFAULT_A4);
    for (let i = 0; i < en432.length; i++) {
      // Todas bajan lo mismo: el intervalo entre cuerdas no cambia.
      expect(centsBetween(en432[i].frequency, en440[i].frequency)).toBeCloseTo(
        centsBetween(432, 440),
        6,
      );
    }
  });

  it("elige la cuerda que estás tocando", () => {
    const targets = stringTargets(BARITONE);
    // Un G3 apenas bajo es la 3ª cuerda, no la 4ª
    const flatG = midiToFrequency(55) * Math.pow(2, -40 / 1200);
    const match = nearestString(flatG, targets)!;
    expect(match.target.fullName).toBe("G3");
    expect(match.cents).toBeCloseTo(-40, 0);

    // Una nota que no es ninguna de las cuatro no se fuerza a la más cercana
    expect(nearestString(midiToFrequency(64 + 7), targets)).toBeNull(); // B4
  });

  it("dice para qué lado girar la clavija", () => {
    expect(verdictFor(0)).toBe("afinada");
    expect(verdictFor(IN_TUNE_CENTS)).toBe("afinada");
    expect(verdictFor(-IN_TUNE_CENTS)).toBe("afinada");
    // Baja = suena grave = hay que tensar
    expect(verdictFor(-20)).toBe("baja");
    expect(instructionFor("baja")).toContain("Tensá");
    // Alta = suena aguda = hay que aflojar
    expect(verdictFor(20)).toBe("alta");
    expect(instructionFor("alta")).toContain("Aflojá");
  });

  it("el desvío que se muestra nunca pasa de medio semitono", () => {
    for (let hz = 130; hz < 350; hz += 0.37) {
      const note = readNote(hz);
      expect(Math.abs(note.cents)).toBeLessThanOrEqual(50.0001);
      // Y la nota que informa es realmente la más cercana
      expect(Math.abs(centsBetween(hz, midiToFrequency(note.midi)))).toBeCloseTo(
        Math.abs(note.cents),
        6,
      );
    }
  });
});

describe("cadena completa: del audio a la instrucción", () => {
  it("una cuerda floja manda a tensar y la misma cuerda afinada da por terminado", () => {
    const targets = stringTargets(BARITONE);
    const dTarget = targets[0];

    // D3 veinte cents bajo, con timbre de cuerda
    const flat = detectPitch(
      tone(dTarget.frequency * Math.pow(2, -20 / 1200), {
        harmonics: [1, 0.6, 0.35, 0.2],
        decay: 1.8,
        noise: 0.02,
      }),
      SAMPLE_RATE,
    );
    const flatMatch = nearestString(flat.frequency!, targets)!;
    expect(flatMatch.target.fullName).toBe("D3");
    expect(flatMatch.cents).toBeGreaterThan(-25);
    expect(flatMatch.cents).toBeLessThan(-15);
    expect(verdictFor(flatMatch.cents)).toBe("baja");

    // La misma cuerda ya afinada
    const good = detectPitch(
      tone(dTarget.frequency, { harmonics: [1, 0.6, 0.35, 0.2], decay: 1.8, noise: 0.02 }),
      SAMPLE_RATE,
    );
    const goodMatch = nearestString(good.frequency!, targets)!;
    expect(verdictFor(goodMatch.cents)).toBe("afinada");
  });
});

describe("mensajes", () => {
  it("avisa cuando hay que girar mucho, no un toque", () => {
    // Un semitono de más queda fuera del dial: el indicador se pega al borde
    // y el texto tiene que decir que falta bastante.
    expect(instructionFor("alta", 100)).toContain("bastante");
    expect(instructionFor("baja", -100)).toContain("bastante");
    expect(instructionFor("alta", 20)).not.toContain("bastante");
    expect(instructionFor("baja", -20)).not.toContain("bastante");
    expect(instructionFor("afinada", 0)).toBe("Afinada");
  });
});
