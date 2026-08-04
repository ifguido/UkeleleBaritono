"use client";

import { PositionNote } from "@/lib/engine/scale-fretboard";

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

/**
 * Tablatura: la cuerda más aguda arriba, un número por nota.
 * Es la forma más directa de leer una secuencia sin saber solfeo.
 */
export default function TabStaff({
  notes,
  activeIndex = null,
  grouping = 4,
  footer = "degree",
  stringLabels = ["D", "G", "B", "E"],
  onNoteClick,
}: Props) {
  const nStrings = stringLabels.length;
  const colW = 26;
  const rowH = 17;
  const padLeft = 22;
  const padTop = 12;
  const footerH = footer === "none" ? 8 : 22;

  const width = padLeft + Math.max(1, notes.length) * colW + 10;
  const height = padTop + (nStrings - 1) * rowH + footerH + 10;

  const rowY = (stringIdx: number) => padTop + (nStrings - 1 - stringIdx) * rowH;
  const colX = (i: number) => padLeft + i * colW + colW / 2;

  const ink = "#292524";
  const soft = "#a8a29e";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label="Tablatura de la secuencia">
      {stringLabels.map((label, stringIdx) => (
        <g key={stringIdx}>
          <line
            x1={padLeft}
            y1={rowY(stringIdx)}
            x2={width - 6}
            y2={rowY(stringIdx)}
            stroke={soft}
            strokeWidth={1}
          />
          <text x={padLeft - 8} y={rowY(stringIdx) + 3.5} fontSize={9.5} fill={soft} textAnchor="middle">
            {label}
          </text>
        </g>
      ))}

      {/* Marcas de pulso */}
      {grouping > 1 &&
        notes.map((_, i) =>
          i > 0 && i % grouping === 0 ? (
            <line
              key={`beat-${i}`}
              x1={padLeft + i * colW}
              y1={rowY(nStrings - 1) - 7}
              x2={padLeft + i * colW}
              y2={rowY(0) + 7}
              stroke="#e7e5e4"
              strokeWidth={1}
            />
          ) : null,
        )}

      {notes.map((note, i) => {
        const isActive = activeIndex === i;
        return (
          <g
            key={i}
            onClick={onNoteClick ? () => onNoteClick(i) : undefined}
            style={onNoteClick ? { cursor: "pointer" } : undefined}
          >
            <rect
              x={colX(i) - 9}
              y={rowY(note.stringIdx) - 7}
              width={18}
              height={14}
              rx={3}
              fill={isActive ? "#f59e0b" : "#ffffff"}
              stroke={isActive ? "#b45309" : "transparent"}
              strokeWidth={1}
            />
            <text
              x={colX(i)}
              y={rowY(note.stringIdx) + 3.6}
              fontSize={11}
              fill={ink}
              textAnchor="middle"
              fontWeight={note.isRoot ? 700 : 500}
              fontFamily="var(--font-geist-mono), monospace"
            >
              {note.fret}
            </text>
            {footer !== "none" && (
              <text
                x={colX(i)}
                y={height - 6}
                fontSize={9}
                fill={note.isRoot ? "#0f766e" : soft}
                textAnchor="middle"
                fontWeight={note.isRoot ? 700 : 400}
              >
                {footer === "degree" ? note.degree : note.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
