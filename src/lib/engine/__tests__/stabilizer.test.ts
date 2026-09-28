import { describe, expect, it } from "vitest";
import { detectPitch } from "../../audio/pitch";
import { StableReading, TunerStabilizer } from "../../audio/stabilizer";
import { BARITONE } from "../notes";
import { DEFAULT_A4, centsBetween, stickyVerdict, stringTargets, tunerReading } from "../tuning";

const FRAME_MS = 40;
const D3 = 146.832;
const G3 = 195.998;

/** Ruido reproducible entre -1 y 1. */
function noise(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return (state / 4294967296) * 2 - 1;
  };
}

/** Pasa una serie de cuadros (frecuencia o null) y devuelve lo que salió de cada uno. */
function run(stabilizer: TunerStabilizer, frames: (number | null)[], startMs = 0) {
  return frames.map((f, i) => stabilizer.push(f, startMs + i * FRAME_MS));
}

const withCents = (frequency: number, cents: number) => frequency * Math.pow(2, cents / 1200);

describe("TunerStabilizer", () => {
  it("aquieta el temblor de una cuerda sostenida", () => {
    const random = noise(3);
    const frames = Array.from({ length: 60 }, () => withCents(D3, 4 * random()));
    const out = run(new TunerStabilizer(), frames);
    // Después de medio segundo, la aguja se mueve mucho menos que la entrada (±4).
    const settled = out.slice(15).map((r) => centsBetween(r!.frequency, D3));
    const spread = Math.max(...settled) - Math.min(...settled);
    expect(spread).toBeLessThan(3);
    expect(Math.abs(settled.reduce((a, b) => a + b, 0) / settled.length)).toBeLessThan(1.5);
  });

  it("no se cae al centro por un cuadro perdido", () => {
    const frames = [D3, D3, D3, D3, null, D3, D3, null, null, D3, D3];
    const out = run(new TunerStabilizer(), frames);
    expect(out.slice(2).every((r) => r !== null)).toBe(true);
    // Un cuadro perdido no alcanza para marcar la lectura como vieja.
    expect(out[4]!.fresh).toBe(true);
  });

  it("sostiene la última lectura cuando la cuerda se calla, y después la suelta", () => {
    const stabilizer = new TunerStabilizer({ holdMs: 1500 });
    const frames: (number | null)[] = [...Array(10).fill(withCents(D3, -12)), ...Array(50).fill(null)];
    const out = run(stabilizer, frames);
    const lastSignal = 9;
    // Un segundo después sigue mostrando la misma nota, atenuada.
    const oneSecondLater = out[lastSignal + 25]!;
    expect(oneSecondLater).not.toBeNull();
    expect(oneSecondLater.fresh).toBe(false);
    expect(centsBetween(oneSecondLater.frequency, D3)).toBeCloseTo(-12, 0);
    // Pasado el tiempo de sostén, se apaga.
    expect(out[lastSignal + 45]).toBeNull();
  });

  it("salta directo a otra cuerda sin arrastrarse por el dial", () => {
    const frames = [...Array(15).fill(D3), ...Array(10).fill(G3)];
    const out = run(new TunerStabilizer(), frames);
    const after = out.slice(15) as StableReading[];
    // Ninguna lectura queda en el medio (entre D3 y G3 hay 500 cents).
    for (const reading of after) {
      const fromD = Math.abs(centsBetween(reading.frequency, D3));
      const fromG = Math.abs(centsBetween(reading.frequency, G3));
      expect(Math.min(fromD, fromG)).toBeLessThan(1);
    }
    // Y a los pocos cuadros ya está en G3.
    expect(centsBetween(after[4].frequency, G3)).toBeCloseTo(0, 1);
  });

  it("ignora una octava suelta en el ataque", () => {
    const frames = [D3, D3, D3, D3, D3 * 2, D3, D3];
    const out = run(new TunerStabilizer(), frames);
    for (const reading of out.slice(2)) {
      expect(Math.abs(centsBetween(reading!.frequency, D3))).toBeLessThan(1);
    }
  });

  it("sigue a la clavija cuando se gira, con poco retraso", () => {
    // De -40 a 0 cents en un segundo, y quieta después.
    const frames = Array.from({ length: 40 }, (_, i) => withCents(D3, Math.min(0, -40 + i * 1.6)));
    const out = run(new TunerStabilizer(), frames);
    // Medio segundo después de que la cuerda llega a 0, la aguja también.
    expect(Math.abs(centsBetween(out[37]!.frequency, D3))).toBeLessThan(1.5);
    // Y nunca se pasa para el otro lado.
    expect(out.every((r) => r === null || centsBetween(r.frequency, D3) < 0.5)).toBe(true);
  });

  it("empieza de cero después de un silencio largo", () => {
    const stabilizer = new TunerStabilizer();
    run(stabilizer, Array(10).fill(D3));
    run(stabilizer, Array(60).fill(null), 10 * FRAME_MS);
    const out = run(stabilizer, Array(5).fill(withCents(D3, 20)), 70 * FRAME_MS);
    // Sin arrastre desde la nota anterior: la primera lectura ya está en +20.
    const first = out.find((r) => r !== null)!;
    expect(centsBetween(first.frequency, D3)).toBeCloseTo(20, 0);
  });
});

/**
 * Una cuerda pulsada de verdad, cuadro a cuadro, pasando por el detector:
 * medio segundo de ruido de sala, el ataque algo agudo y un decaimiento de
 * nylon que termina hundido en el ruido.
 */
function pluckedString(cents: number, noiseRms: number): { frames: Float32Array[]; sampleRate: number } {
  const sampleRate = 44100;
  const size = 4096;
  const hop = (sampleRate * FRAME_MS) / 1000;
  const frequency = withCents(D3, cents);
  const random = noise(11);
  const total = Math.round(4 * sampleRate);
  const signal = new Float32Array(total);
  const harmonics = [1, 0.3, 0.12, 0.05, 0.02];
  for (let i = 0; i < total; i++) {
    const t = i / sampleRate - 0.5;
    let value = 0;
    if (t >= 0) {
      const attack = 1 + 0.0015 * Math.exp(-t / 0.1);
      harmonics.forEach((gain, k) => {
        value += gain * Math.exp(-t * (1.6 + k * 0.8)) * Math.sin(2 * Math.PI * frequency * attack * (k + 1) * t);
      });
    }
    signal[i] = 0.25 * value + noiseRms * Math.sqrt(3) * random();
  }
  const frames: Float32Array[] = [];
  for (let start = 0; start + size <= total; start += hop) frames.push(signal.subarray(start, start + size));
  return { frames, sampleRate };
}

describe("TunerStabilizer con el detector", () => {
  for (const [room, noiseRms] of [
    ["silenciosa", 0.0009],
    ["ruidosa", 0.0035],
  ] as const) {
    it(`sala ${room}: la aguja queda quieta en el desvío real mientras la cuerda se apaga`, () => {
      const { frames, sampleRate } = pluckedString(-8, noiseRms);
      const stabilizer = new TunerStabilizer();
      const shown: number[] = [];
      let blanks = 0;
      frames.forEach((frame, i) => {
        const result = detectPitch(frame, sampleRate);
        const usable = result.clarity >= 0.82 ? result.frequency : null;
        const reading = stabilizer.push(usable, i * FRAME_MS, result.level);
        const t = (i * FRAME_MS) / 1000;
        // Entre que la cuerda ya se leyó y los 2,5 s, siempre hay aguja.
        if (t > 0.7 && t < 2.5) {
          if (reading === null) blanks++;
          else shown.push(centsBetween(reading.frequency, D3));
        }
      });
      expect(blanks).toBe(0);
      for (const cents of shown) expect(Math.abs(cents + 8)).toBeLessThan(1.5);
    });
  }
});

describe("veredicto con histéresis", () => {
  it("entra al verde en ±5 y sale recién pasando ±7", () => {
    expect(stickyVerdict(6, null)).toBe("alta");
    expect(stickyVerdict(4.9, null)).toBe("afinada");
    expect(stickyVerdict(6, "afinada")).toBe("afinada");
    expect(stickyVerdict(-6.9, "afinada")).toBe("afinada");
    expect(stickyVerdict(7.5, "afinada")).toBe("alta");
  });

  it("la histéresis no pasa de una cuerda a otra", () => {
    const settings = { mode: "cuerdas" as const, pinned: null, targets: stringTargets(BARITONE, DEFAULT_A4), a4: DEFAULT_A4 };
    const onD = tunerReading(withCents(D3, 3), settings, null);
    expect(onD.verdict).toBe("afinada");
    const sameString = tunerReading(withCents(D3, 6), settings, onD);
    expect(sameString.verdict).toBe("afinada");
    const otherString = tunerReading(withCents(G3, 6), settings, onD);
    expect(otherString.verdict).toBe("alta");
  });
});
