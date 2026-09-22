import Svg, { Circle, G, Line, Text as SvgText } from "react-native-svg";
import { BARITONE, Tuning } from "@core/engine/notes";
import { FretNote } from "@core/engine/scale-fretboard";
import { useTheme } from "@/theme/useTheme";

interface Props {
  notes: FretNote[];
  maxFret?: number;
  tuning?: Tuning;
  /** Qué se escribe dentro de cada punto. */
  labelMode?: "degree" | "note";
  /** Notas de la caja elegida: el resto se atenúa. */
  highlight?: Set<string> | null;
  /** Nota que está sonando ("cuerda:traste"). */
  active?: string | null;
  onNoteClick?: (note: FretNote) => void;
}

const INLAYS = [3, 5, 7, 10, 15];
const DOUBLE_INLAYS = [12];

/** Clave estable de una posición del mástil. */
export function fretKey(note: { stringIdx: number; fret: number }): string {
  return `${note.stringIdx}:${note.fret}`;
}

/** Ancho del diagrama, para que la pantalla sepa cuánto scroll horizontal hay. */
export function fretboardWidth(maxFret = 15): number {
  return 34 + 26 + maxFret * 40 + 12;
}

/**
 * Mástil completo en horizontal: la cuerda más aguda arriba, como se ve el
 * instrumento apoyado sobre la pierna. Cada punto es una nota real de la
 * escala. En el teléfono va dentro de un scroll horizontal.
 */
export function FretboardDiagram({
  notes,
  maxFret = 15,
  tuning = BARITONE,
  labelMode = "degree",
  highlight = null,
  active = null,
  onNoteClick,
}: Props) {
  const t = useTheme();
  const nStrings = tuning.strings.length;
  const cellW = 40;
  const rowH = 32;
  const padLeft = 34;
  const padTop = 16;
  const openW = 26;

  const width = fretboardWidth(maxFret);
  const height = padTop + (nStrings - 1) * rowH + 34;

  const rowY = (stringIdx: number) => padTop + (nStrings - 1 - stringIdx) * rowH;
  const fretLineX = (fret: number) => padLeft + openW + fret * cellW;
  const dotX = (fret: number) => (fret === 0 ? padLeft + openW / 2 : fretLineX(fret) - cellW / 2);

  const boardTop = rowY(nStrings - 1);
  const boardBottom = rowY(0);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel="Escala sobre el diapasón">
      {INLAYS.filter((f) => f <= maxFret).map((fret) => (
        <Circle key={`i${fret}`} cx={dotX(fret)} cy={height - 20} r={3} fill={t.faint} stroke={t.soft} strokeWidth={0.8} />
      ))}
      {DOUBLE_INLAYS.filter((f) => f <= maxFret).map((fret) => (
        <G key={`d${fret}`}>
          <Circle cx={dotX(fret) - 5} cy={height - 20} r={3} fill={t.faint} stroke={t.soft} strokeWidth={0.8} />
          <Circle cx={dotX(fret) + 5} cy={height - 20} r={3} fill={t.faint} stroke={t.soft} strokeWidth={0.8} />
        </G>
      ))}

      {Array.from({ length: maxFret + 1 }, (_, fret) => (
        <Line
          key={`f${fret}`}
          x1={fretLineX(fret)}
          y1={boardTop}
          x2={fretLineX(fret)}
          y2={boardBottom}
          stroke={fret === 0 ? t.ink : t.soft}
          strokeWidth={fret === 0 ? 3 : 1}
        />
      ))}

      {tuning.strings.map((_, stringIdx) => (
        <Line
          key={`s${stringIdx}`}
          x1={padLeft}
          y1={rowY(stringIdx)}
          x2={fretLineX(maxFret)}
          y2={rowY(stringIdx)}
          stroke={t.ink}
          strokeWidth={0.5 + (nStrings - 1 - stringIdx) * 0.25}
          opacity={0.55}
        />
      ))}

      {tuning.labels.map((label, stringIdx) => (
        <SvgText key={`l${stringIdx}`} x={padLeft - 10} y={rowY(stringIdx) + 4} fontSize={11} fill={t.soft} textAnchor="middle" fontWeight="600">
          {label}
        </SvgText>
      ))}

      {Array.from({ length: maxFret + 1 }, (_, fret) => (
        <SvgText key={`n${fret}`} x={dotX(fret)} y={height - 5} fontSize={9} fill={t.soft} textAnchor="middle">
          {String(fret)}
        </SvgText>
      ))}

      {notes.map((note) => {
        if (note.fret > maxFret) return null;
        const key = fretKey(note);
        const dim = highlight !== null && !highlight.has(key);
        const isActive = active === key;
        const r = note.fret === 0 ? 9.5 : 11.5;
        const fill = isActive ? t.playing : note.isRoot ? t.tonic : t.dotFill;
        const stroke = isActive ? t.playingBorder : note.isRoot ? t.tonic : t.ink;
        const textFill = note.isRoot ? t.tonicText : isActive ? t.playingText : t.dotText;
        return (
          <G key={key} opacity={dim ? 0.22 : 1} onPress={onNoteClick ? () => onNoteClick(note) : undefined}>
            {/* Área de toque generosa, invisible */}
            <Circle cx={dotX(note.fret)} cy={rowY(note.stringIdx)} r={16} fill="transparent" />
            <Circle
              cx={dotX(note.fret)}
              cy={rowY(note.stringIdx)}
              r={isActive ? r + 2 : r}
              fill={fill}
              stroke={stroke}
              strokeWidth={note.isRoot || isActive ? 1.5 : 1}
            />
            <SvgText
              x={dotX(note.fret)}
              y={rowY(note.stringIdx) + 3.4}
              fontSize={note.isRoot || isActive ? 10 : 9.5}
              fill={textFill}
              textAnchor="middle"
              fontWeight={note.isRoot ? "700" : "500"}
            >
              {labelMode === "degree" ? note.degree : note.name}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
