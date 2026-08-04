"use client";

import { FretNote } from "@/lib/engine/scale-fretboard";
import { BARITONE, Tuning } from "@/lib/engine/notes";

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

/**
 * Mástil completo en horizontal: la cuerda más aguda arriba, como se ve
 * el instrumento apoyado sobre la pierna. Cada punto es una nota real de la
 * escala, con su grado adentro.
 */
export default function FretboardDiagram({
  notes,
  maxFret = 15,
  tuning = BARITONE,
  labelMode = "degree",
  highlight = null,
  active = null,
  onNoteClick,
}: Props) {
  const nStrings = tuning.strings.length;
  const cellW = 40;
  const rowH = 30;
  const padLeft = 34;
  const padTop = 16;
  const openW = 26;

  const width = padLeft + openW + maxFret * cellW + 12;
  const height = padTop + (nStrings - 1) * rowH + 34;

  // Cuerda 0 (la más grave) va abajo.
  const rowY = (stringIdx: number) => padTop + (nStrings - 1 - stringIdx) * rowH;
  const fretLineX = (fret: number) => padLeft + openW + fret * cellW;
  const dotX = (fret: number) => (fret === 0 ? padLeft + openW / 2 : fretLineX(fret) - cellW / 2);

  const ink = "#292524";
  const soft = "#a8a29e";
  const faint = "#e7e5e4";
  const boardTop = rowY(nStrings - 1);
  const boardBottom = rowY(0);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Escala sobre el diapasón"
    >
      {/* Marcadores de traste */}
      {INLAYS.filter((f) => f <= maxFret).map((fret) => (
        <circle key={fret} cx={dotX(fret)} cy={height - 20} r={3} fill={faint} stroke={soft} strokeWidth={0.8} />
      ))}
      {DOUBLE_INLAYS.filter((f) => f <= maxFret).map((fret) => (
        <g key={fret}>
          <circle cx={dotX(fret) - 5} cy={height - 20} r={3} fill={faint} stroke={soft} strokeWidth={0.8} />
          <circle cx={dotX(fret) + 5} cy={height - 20} r={3} fill={faint} stroke={soft} strokeWidth={0.8} />
        </g>
      ))}

      {/* Trastes */}
      {Array.from({ length: maxFret + 1 }, (_, fret) => (
        <line
          key={fret}
          x1={fretLineX(fret)}
          y1={boardTop}
          x2={fretLineX(fret)}
          y2={boardBottom}
          stroke={fret === 0 ? ink : soft}
          strokeWidth={fret === 0 ? 3 : 1}
        />
      ))}

      {/* Cuerdas */}
      {tuning.strings.map((_, stringIdx) => (
        <line
          key={stringIdx}
          x1={padLeft}
          y1={rowY(stringIdx)}
          x2={fretLineX(maxFret)}
          y2={rowY(stringIdx)}
          stroke={ink}
          strokeWidth={0.5 + (nStrings - 1 - stringIdx) * 0.25}
          opacity={0.55}
        />
      ))}

      {/* Etiquetas de cuerda */}
      {tuning.labels.map((label, stringIdx) => (
        <text
          key={stringIdx}
          x={padLeft - 10}
          y={rowY(stringIdx) + 4}
          fontSize={11}
          fill={soft}
          textAnchor="middle"
          fontWeight={600}
        >
          {label}
        </text>
      ))}

      {/* Números de traste */}
      {Array.from({ length: maxFret + 1 }, (_, fret) => (
        <text
          key={fret}
          x={dotX(fret)}
          y={height - 5}
          fontSize={9}
          fill={soft}
          textAnchor="middle"
        >
          {fret}
        </text>
      ))}

      {/* Notas de la escala */}
      {notes.map((note) => {
        if (note.fret > maxFret) return null;
        const key = fretKey(note);
        const dim = highlight !== null && !highlight.has(key);
        const isActive = active === key;
        const r = note.fret === 0 ? 9.5 : 11;
        return (
          <g
            key={key}
            opacity={dim ? 0.22 : 1}
            onClick={onNoteClick ? () => onNoteClick(note) : undefined}
            style={onNoteClick ? { cursor: "pointer" } : undefined}
          >
            <circle
              cx={dotX(note.fret)}
              cy={rowY(note.stringIdx)}
              r={isActive ? r + 2 : r}
              fill={isActive ? "#f59e0b" : note.isRoot ? "#0f766e" : "#ffffff"}
              stroke={isActive ? "#b45309" : note.isRoot ? "#0f766e" : ink}
              strokeWidth={note.isRoot || isActive ? 1.5 : 1}
            />
            <text
              x={dotX(note.fret)}
              y={rowY(note.stringIdx) + 3.4}
              fontSize={note.isRoot || isActive ? 10 : 9.5}
              fill={note.isRoot ? "#ffffff" : isActive ? "#1c1917" : ink}
              textAnchor="middle"
              fontWeight={note.isRoot ? 700 : 500}
            >
              {labelMode === "degree" ? note.degree : note.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
