import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import { ScalePosition } from "@core/engine/scale-fretboard";
import { useTheme } from "@/theme/useTheme";
import { fretKey } from "./FretboardDiagram";

interface Props {
  position: ScalePosition;
  /** Qué se escribe adentro del punto. */
  labelMode?: "finger" | "degree" | "note";
  /** Nota que está sonando ("cuerda:traste"). */
  active?: string | null;
  size?: "sm" | "lg";
  stringLabels?: string[];
}

/**
 * La caja en vertical, como se mira el mástil al tocar: cuerdas D-G-B-E de
 * izquierda a derecha. Cada punto es una nota de la escala dentro de la
 * posición; la tónica va en el color de marca.
 */
export function ScaleBoxDiagram({ position, labelMode = "finger", active = null, size = "lg", stringLabels = ["D", "G", "B", "E"] }: Props) {
  const t = useTheme();
  const cell =
    size === "sm"
      ? { w: 22, h: 26, dot: 8, font: 9, top: 20, left: 16, right: 24 }
      : { w: 34, h: 38, dot: 12, font: 12, top: 28, left: 22, right: 34 };

  const fretted = position.path.filter((n) => n.fret > 0).map((n) => n.fret);
  const minFret = fretted.length ? Math.min(...fretted) : 1;
  const maxFret = fretted.length ? Math.max(...fretted) : 4;
  const baseFret = maxFret <= 4 ? 1 : minFret;
  const rows = Math.max(4, maxFret - baseFret + 1);

  const nStrings = stringLabels.length;
  const width = cell.left + (nStrings - 1) * cell.w + cell.right;
  const height = cell.top + rows * cell.h + (size === "sm" ? 16 : 22);

  const stringX = (i: number) => cell.left + i * cell.w;
  const fretY = (row: number) => cell.top + row * cell.h;

  const notes = position.byString.flat();

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel={`Caja de escala en el traste ${position.baseFret}`}>
      {baseFret === 1 ? (
        <Rect x={stringX(0) - 1} y={cell.top - 3} width={(nStrings - 1) * cell.w + 2} height={3.5} fill={t.ink} rx={1} />
      ) : (
        <SvgText x={width - 2} y={fretY(0) + cell.h / 2 + cell.font / 3} fontSize={cell.font} fill={t.soft} textAnchor="end">
          {`${baseFret}fr`}
        </SvgText>
      )}

      {Array.from({ length: rows + 1 }, (_, r) => (
        <Line key={`f${r}`} x1={stringX(0)} y1={fretY(r)} x2={stringX(nStrings - 1)} y2={fretY(r)} stroke={t.soft} strokeWidth={1} />
      ))}
      {stringLabels.map((_, i) => (
        <Line key={`s${i}`} x1={stringX(i)} y1={cell.top} x2={stringX(i)} y2={fretY(rows)} stroke={t.ink} strokeWidth={1} opacity={0.7} />
      ))}

      {notes.map((note) => {
        const key = fretKey(note);
        const isActive = active === key;
        const label =
          labelMode === "finger" ? (note.fret === 0 ? "0" : String(note.finger)) : labelMode === "degree" ? note.degree : note.name;
        const fill = isActive ? t.playing : note.isRoot ? t.tonic : t.dotFill;
        const stroke = isActive ? t.playingBorder : note.isRoot ? t.tonic : t.ink;
        const textFill = note.isRoot ? t.tonicText : isActive ? t.playingText : t.dotText;

        if (note.fret === 0) {
          return (
            <G key={key}>
              <Circle cx={stringX(note.stringIdx)} cy={cell.top - cell.dot - 4} r={cell.dot * 0.72} fill={fill} stroke={note.isRoot ? t.tonic : t.ink} strokeWidth={1.3} />
              {labelMode !== "finger" && (
                <SvgText x={stringX(note.stringIdx)} y={cell.top - cell.dot - 1} fontSize={cell.font * 0.75} fill={textFill} textAnchor="middle" fontWeight={note.isRoot ? "700" : "500"}>
                  {label}
                </SvgText>
              )}
            </G>
          );
        }

        const row = note.fret - baseFret;
        if (row < 0 || row >= rows) return null;
        return (
          <G key={key}>
            <Circle cx={stringX(note.stringIdx)} cy={fretY(row) + cell.h / 2} r={isActive ? cell.dot + 2 : cell.dot} fill={fill} stroke={stroke} strokeWidth={1.4} />
            <SvgText
              x={stringX(note.stringIdx)}
              y={fretY(row) + cell.h / 2 + cell.font / 3}
              fontSize={cell.font * (label.length > 2 ? 0.78 : 0.95)}
              fill={textFill}
              textAnchor="middle"
              fontWeight={note.isRoot ? "700" : "500"}
            >
              {label}
            </SvgText>
          </G>
        );
      })}

      {stringLabels.map((label, i) => (
        <SvgText key={`l${i}`} x={stringX(i)} y={height - 4} fontSize={cell.font} fill={t.soft} textAnchor="middle">
          {label}
        </SvgText>
      ))}
    </Svg>
  );
}
