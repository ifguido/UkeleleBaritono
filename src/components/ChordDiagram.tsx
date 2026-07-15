import { Barre, Fret } from "@/lib/engine/voicings";

interface Props {
  frets: Fret[];
  barre?: Barre | null;
  size?: "sm" | "lg" | "xl";
  /** Etiquetas de cuerdas, grave → agudo. */
  stringLabels?: string[];
}

/**
 * Diagrama SVG de acorde: cuerdas verticales (D G B E de izquierda a derecha),
 * ventana de trastes automática con indicador "Nfr".
 */
export default function ChordDiagram({
  frets,
  barre = null,
  size = "sm",
  stringLabels = ["D", "G", "B", "E"],
}: Props) {
  const cell =
    size === "sm"
      ? { w: 15, h: 19, dot: 5, font: 8.5, top: 14, left: 10, right: 16 }
      : size === "xl"
        ? { w: 38, h: 46, dot: 12.5, font: 17, top: 30, left: 24, right: 40 }
        : { w: 24, h: 30, dot: 8, font: 12, top: 20, left: 14, right: 26 };

  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  const maxF = fretted.length ? Math.max(...fretted) : 0;
  const minF = fretted.length ? Math.min(...fretted) : 0;

  // Ventana: desde el traste 1 si entra; si no, desde el mínimo pisado
  const windowSize = Math.max(4, maxF - (maxF <= 4 ? 1 : minF) + 1);
  const baseFret = maxF <= 4 ? 1 : minF;
  const rows = Math.min(windowSize, 6);

  const nStrings = frets.length;
  const width = cell.left + (nStrings - 1) * cell.w + cell.right;
  const height = cell.top + rows * cell.h + (size === "sm" ? 14 : 20);

  const stringX = (i: number) => cell.left + i * cell.w;
  const fretY = (row: number) => cell.top + row * cell.h;

  const ink = "#292524";
  const soft = "#a8a29e";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={`Diagrama ${frets.map((f) => (f === null ? "x" : f)).join("-")}`}>
      {/* Cejilla (nut) o indicador de posición */}
      {baseFret === 1 ? (
        <rect x={stringX(0) - 1} y={cell.top - 2.5} width={(nStrings - 1) * cell.w + 2} height={3} fill={ink} rx={1} />
      ) : (
        <text x={width - 2} y={fretY(1) - cell.h / 2 + cell.font / 2} fontSize={cell.font} fill={soft} textAnchor="end">
          {baseFret}fr
        </text>
      )}

      {/* Trastes */}
      {Array.from({ length: rows + 1 }, (_, r) => (
        <line key={r} x1={stringX(0)} y1={fretY(r)} x2={stringX(nStrings - 1)} y2={fretY(r)}
          stroke={soft} strokeWidth={1} />
      ))}
      {/* Cuerdas */}
      {frets.map((_, i) => (
        <line key={i} x1={stringX(i)} y1={cell.top} x2={stringX(i)} y2={fretY(rows)}
          stroke={ink} strokeWidth={1} />
      ))}

      {/* Barré */}
      {barre && barre.fret >= baseFret && barre.fret < baseFret + rows && (
        <rect
          x={stringX(barre.fromString) - cell.dot}
          y={fretY(barre.fret - baseFret) + cell.h / 2 - cell.dot}
          width={stringX(barre.toString) - stringX(barre.fromString) + cell.dot * 2}
          height={cell.dot * 2}
          rx={cell.dot}
          fill={ink}
          opacity={0.85}
        />
      )}

      {/* Marcadores por cuerda */}
      {frets.map((fret, i) => {
        if (fret === null) {
          return (
            <text key={i} x={stringX(i)} y={cell.top - 5} fontSize={cell.font} fill={soft}
              textAnchor="middle" fontWeight={600}>
              ×
            </text>
          );
        }
        if (fret === 0) {
          return (
            <circle key={i} cx={stringX(i)} cy={cell.top - 5 - cell.font / 3} r={cell.dot * 0.55}
              fill="none" stroke={ink} strokeWidth={1.2} />
          );
        }
        const row = fret - baseFret;
        if (row < 0 || row >= rows) return null;
        const isBarreDot = barre && fret === barre.fret && i >= barre.fromString && i <= barre.toString;
        if (isBarreDot) return null;
        return (
          <circle key={i} cx={stringX(i)} cy={fretY(row) + cell.h / 2} r={cell.dot} fill={ink} />
        );
      })}

      {/* Etiquetas de cuerdas */}
      {stringLabels.map((label, i) => (
        <text key={i} x={stringX(i)} y={height - 3} fontSize={cell.font} fill={soft} textAnchor="middle">
          {label}
        </text>
      ))}
    </svg>
  );
}
