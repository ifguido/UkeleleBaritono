import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { PositionNote } from "@core/engine/scale-fretboard";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/useTheme";

interface Props {
  notes: PositionNote[];
  /** Índice de la nota que está sonando. */
  activeIndex?: number | null;
  /** Cada cuántas notas se marca un pulso. */
  grouping?: number;
  /** Debajo de cada traste: grado o nombre de nota. */
  footer?: "degree" | "note" | "none";
  stringLabels?: string[];
  onNoteClick?: (index: number) => void;
}

const COL_W = 26;

export function tabStaffWidth(count: number): number {
  return 22 + Math.max(1, count) * COL_W + 10;
}

/**
 * Tablatura: la cuerda más aguda arriba, un número por nota. Es la forma
 * más directa de leer una secuencia sin saber solfeo.
 */
export function TabStaff({ notes, activeIndex = null, grouping = 4, footer = "degree", stringLabels = ["D", "G", "B", "E"], onNoteClick }: Props) {
  const t = useTheme();
  const nStrings = stringLabels.length;
  const rowH = 18;
  const padLeft = 22;
  const padTop = 12;
  const footerH = footer === "none" ? 8 : 22;

  const width = tabStaffWidth(notes.length);
  const height = padTop + (nStrings - 1) * rowH + footerH + 10;

  const rowY = (stringIdx: number) => padTop + (nStrings - 1 - stringIdx) * rowH;
  const colX = (i: number) => padLeft + i * COL_W + COL_W / 2;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel="Tablatura de la secuencia">
      {stringLabels.map((label, stringIdx) => (
        <G key={`s${stringIdx}`}>
          <Line x1={padLeft} y1={rowY(stringIdx)} x2={width - 6} y2={rowY(stringIdx)} stroke={t.soft} strokeWidth={1} />
          <SvgText x={padLeft - 8} y={rowY(stringIdx) + 3.5} fontSize={9.5} fill={t.soft} textAnchor="middle">
            {label}
          </SvgText>
        </G>
      ))}

      {grouping > 1 &&
        notes.map((_, i) =>
          i > 0 && i % grouping === 0 ? (
            <Line key={`b${i}`} x1={padLeft + i * COL_W} y1={rowY(nStrings - 1) - 7} x2={padLeft + i * COL_W} y2={rowY(0) + 7} stroke={t.faint} strokeWidth={1} />
          ) : null,
        )}

      {notes.map((note, i) => {
        const isActive = activeIndex === i;
        return (
          <G key={i} onPress={onNoteClick ? () => onNoteClick(i) : undefined}>
            <Rect x={colX(i) - 10} y={rowY(note.stringIdx) - 8} width={20} height={16} rx={3} fill={isActive ? t.playing : t.card} stroke={isActive ? t.playingBorder : "transparent"} strokeWidth={1} />
            <SvgText
              x={colX(i)}
              y={rowY(note.stringIdx) + 3.8}
              fontSize={11}
              fill={isActive ? t.playingText : t.ink}
              textAnchor="middle"
              fontWeight={note.isRoot ? "700" : "500"}
              fontFamily={fonts.mono}
            >
              {String(note.fret)}
            </SvgText>
            {footer !== "none" && (
              <SvgText x={colX(i)} y={height - 6} fontSize={9} fill={note.isRoot ? t.tonic : t.soft} textAnchor="middle" fontWeight={note.isRoot ? "700" : "400"}>
                {footer === "degree" ? note.degree : note.name}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}
