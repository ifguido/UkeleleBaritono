"use client";

import { IN_TUNE_CENTS, TuningVerdict } from "@/lib/engine/tuning";

interface Props {
  /** Desvío en cents, o null si no hay nota. */
  cents: number | null;
  verdict: TuningVerdict | null;
  /** Nota grande del centro ("D3"). */
  note: string;
  /** Línea de abajo ("146,8 Hz · −20 cents"). */
  detail: string;
  /** Cents que abarca el dial de punta a punta (a cada lado). */
  range?: number;
}

const COLORS: Record<TuningVerdict, string> = {
  afinada: "#059669",
  baja: "#d97706",
  alta: "#d97706",
};

const WIDTH = 340;
const HEIGHT = 208;
const CX = WIDTH / 2;
const CY = 176;
const RADIUS = 134;
const RING = 15;
const SWEEP = 68; // grados hacia cada lado

/**
 * Dial de afinación.
 *
 * El indicador viaja sobre el arco en vez de ser una aguja desde el centro:
 * así el nombre de la nota queda siempre legible, que es lo que uno mira de
 * reojo mientras gira la clavija con las dos manos ocupadas.
 *
 * La zona verde son los ±5 cents que el oído no distingue: llegar ahí es
 * haber terminado, no hace falta clavar el cero.
 */
export default function TunerGauge({ cents, verdict, note, detail, range = 50 }: Props) {
  const clamped = cents === null ? 0 : Math.max(-range, Math.min(range, cents));
  const angle = (clamped / range) * SWEEP;
  const color = verdict ? COLORS[verdict] : "#a8a29e";
  const silent = cents === null;

  const point = (degrees: number, r: number) => {
    const rad = ((degrees - 90) * Math.PI) / 180;
    return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)] as const;
  };

  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = point(from, r);
    const [x2, y2] = point(to, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  const greenHalf = (IN_TUNE_CENTS / range) * SWEEP;
  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].filter(
    (tick) => Math.abs(tick) <= range,
  );

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ maxWidth: WIDTH }}
      role="img"
      aria-label={silent ? "Sin señal" : `${note}, ${Math.round(cents)} cents`}
    >
      {/* Arco base */}
      <path d={arc(-SWEEP, SWEEP, RADIUS)} fill="none" stroke="#e7e5e4" strokeWidth={RING}
        strokeLinecap="round" />
      {/* Zona afinada */}
      <path d={arc(-greenHalf, greenHalf, RADIUS)} fill="none"
        stroke={verdict === "afinada" ? "#059669" : "#a7f3d0"} strokeWidth={RING} strokeLinecap="round" />

      {/* Marcas cada 10 cents. Sin números: el desvío exacto ya está escrito
          debajo de la nota, y acá lo único que importa es cuánto falta. */}
      {ticks.map((tick) => {
        const degrees = (tick / range) * SWEEP;
        const major = tick % 20 === 0;
        const [x1, y1] = point(degrees, RADIUS - RING / 2 - 2);
        const [x2, y2] = point(degrees, RADIUS - RING / 2 - (major ? 13 : 7));
        return (
          <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={tick === 0 ? "#1c1917" : "#d6d3d1"} strokeWidth={tick === 0 ? 2.5 : 1.5} />
        );
      })}

      {/* Indicador: viaja sobre el arco */}
      <g
        transform={`rotate(${angle} ${CX} ${CY})`}
        style={{ transition: "transform 90ms linear" }}
        opacity={silent ? 0.2 : 1}
      >
        <path d={arc(-2.6, 2.6, RADIUS)} fill="none" stroke={color} strokeWidth={RING + 6}
          strokeLinecap="butt" />
        <polygon
          points={`${CX},${CY - RADIUS + RING / 2 + 12} ${CX - 8},${CY - RADIUS + RING / 2 + 25} ${CX + 8},${CY - RADIUS + RING / 2 + 25}`}
          fill={color}
        />
      </g>

      {/* Lectura, siempre despejada en el centro */}
      <text x={CX} y={CY - 46} fontSize={note.length > 2 ? 46 : 52}
        fill={silent ? "#d6d3d1" : "#1c1917"} textAnchor="middle" fontWeight={700}>
        {note}
      </text>
      <text x={CX} y={CY - 22} fontSize={12.5} fill="#78716c" textAnchor="middle"
        fontFamily="var(--font-geist-mono), monospace">
        {detail}
      </text>

    </svg>
  );
}
