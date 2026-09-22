import Svg, { Circle, Line, Rect, Text as SvgText } from "react-native-svg";
import { Barre, Fret } from "@core/engine/voicings";
import { useTheme } from "@/theme/useTheme";

interface Props {
  frets: Fret[];
  barre?: Barre | null;
  size?: "sm" | "md" | "lg" | "xl";
  /** Etiquetas de cuerdas, grave → agudo. */
  stringLabels?: string[];
  /** Color de los puntos; por defecto la tinta del tema. */
  dotColor?: string;
}

const SIZES = {
  sm: { w: 15, h: 19, dot: 5, font: 8.5, top: 14, left: 10, right: 16, bottom: 14 },
  md: { w: 19, h: 24, dot: 6.5, font: 10, top: 17, left: 12, right: 20, bottom: 17 },
  lg: { w: 24, h: 30, dot: 8, font: 12, top: 20, left: 14, right: 26, bottom: 20 },
  xl: { w: 38, h: 46, dot: 12.5, font: 17, top: 30, left: 24, right: 40, bottom: 20 },
} as const;

/** Ancho y alto que ocupará el diagrama, para reservar espacio en listas. */
export function chordDiagramSize(size: keyof typeof SIZES, strings = 4, rows = 4) {
  const cell = SIZES[size];
  return {
    width: cell.left + (strings - 1) * cell.w + cell.right,
    height: cell.top + rows * cell.h + cell.bottom,
  };
}

/**
 * Diagrama de acorde: cuerdas verticales (D G B E de izquierda a derecha),
 * ventana de trastes automática con indicador "Nfr". Es el mismo dibujo que
 * la web, traducido a react-native-svg.
 */
export function ChordDiagram({ frets, barre = null, size = "sm", stringLabels = ["D", "G", "B", "E"], dotColor }: Props) {
  const t = useTheme();
  const cell = SIZES[size];

  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  const maxF = fretted.length ? Math.max(...fretted) : 0;
  const minF = fretted.length ? Math.min(...fretted) : 0;

  // Ventana: desde el traste 1 si entra; si no, desde el mínimo pisado
  const windowSize = Math.max(4, maxF - (maxF <= 4 ? 1 : minF) + 1);
  const baseFret = maxF <= 4 ? 1 : minF;
  const rows = Math.min(windowSize, 6);

  const nStrings = frets.length;
  const width = cell.left + (nStrings - 1) * cell.w + cell.right;
  const height = cell.top + rows * cell.h + cell.bottom;

  const stringX = (i: number) => cell.left + i * cell.w;
  const fretY = (row: number) => cell.top + row * cell.h;

  const ink = dotColor ?? t.ink;
  const soft = t.soft;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityLabel={`Diagrama ${frets.map((f) => (f === null ? "x" : f)).join("-")}`}
    >
      {baseFret === 1 ? (
        <Rect x={stringX(0) - 1} y={cell.top - 2.5} width={(nStrings - 1) * cell.w + 2} height={3} fill={t.ink} rx={1} />
      ) : (
        <SvgText x={width - 2} y={fretY(1) - cell.h / 2 + cell.font / 2} fontSize={cell.font} fill={soft} textAnchor="end">
          {`${baseFret}fr`}
        </SvgText>
      )}

      {Array.from({ length: rows + 1 }, (_, r) => (
        <Line key={`f${r}`} x1={stringX(0)} y1={fretY(r)} x2={stringX(nStrings - 1)} y2={fretY(r)} stroke={soft} strokeWidth={1} />
      ))}
      {frets.map((_, i) => (
        <Line key={`s${i}`} x1={stringX(i)} y1={cell.top} x2={stringX(i)} y2={fretY(rows)} stroke={t.ink} strokeWidth={1} />
      ))}

      {barre && barre.fret >= baseFret && barre.fret < baseFret + rows && (
        <Rect
          x={stringX(barre.fromString) - cell.dot}
          y={fretY(barre.fret - baseFret) + cell.h / 2 - cell.dot}
          width={stringX(barre.toString) - stringX(barre.fromString) + cell.dot * 2}
          height={cell.dot * 2}
          rx={cell.dot}
          fill={ink}
          opacity={0.85}
        />
      )}

      {frets.map((fret, i) => {
        if (fret === null) {
          return (
            <SvgText key={`m${i}`} x={stringX(i)} y={cell.top - 5} fontSize={cell.font} fill={soft} textAnchor="middle" fontWeight="600">
              ×
            </SvgText>
          );
        }
        if (fret === 0) {
          return (
            <Circle key={`m${i}`} cx={stringX(i)} cy={cell.top - 5 - cell.font / 3} r={cell.dot * 0.55} fill="none" stroke={t.ink} strokeWidth={1.2} />
          );
        }
        const row = fret - baseFret;
        if (row < 0 || row >= rows) return null;
        const isBarreDot = barre && fret === barre.fret && i >= barre.fromString && i <= barre.toString;
        if (isBarreDot) return null;
        return <Circle key={`m${i}`} cx={stringX(i)} cy={fretY(row) + cell.h / 2} r={cell.dot} fill={ink} />;
      })}

      {stringLabels.map((label, i) => (
        <SvgText key={`l${i}`} x={stringX(i)} y={height - 3} fontSize={cell.font} fill={soft} textAnchor="middle">
          {label}
        </SvgText>
      ))}
    </Svg>
  );
}
