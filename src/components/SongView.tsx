"use client";

import { ParsedSong } from "@/lib/engine/song-parser";
import { OptimizedOccurrence } from "@/lib/engine/optimizer";

export interface OccurrenceRange {
  start: number;
  end: number;
}

interface Props {
  song: ParsedSong;
  optimized: Map<number, OptimizedOccurrence>;
  onChordClick: (occurrenceIndex: number) => void;
  playingIndex?: number | null;
  /** Modo "seleccionar parte": los clics arman un rango en vez de abrir el detalle. */
  rangeMode?: boolean;
  range?: OccurrenceRange | null;
  /** Ocurrencia seleccionada en el panel (resaltado fuerte). */
  selectedIndex?: number | null;
  /** Símbolo seleccionado: todas sus apariciones se resaltan suave. */
  selectedSymbol?: string | null;
  /** Rango de ocurrencias de cada sección, por índice de línea del encabezado. */
  sectionRanges?: Map<number, OccurrenceRange>;
  onPlaySection?: (range: OccurrenceRange) => void;
}

/**
 * Muestra la canción preservando el layout: líneas de acordes clicables
 * alineadas sobre la letra (fuente monoespaciada).
 */
export default function SongView({
  song,
  optimized,
  onChordClick,
  playingIndex,
  rangeMode = false,
  range = null,
  selectedIndex = null,
  selectedSymbol = null,
  sectionRanges,
  onPlaySection,
}: Props) {
  const inRange = (index: number) =>
    range !== null && index >= range.start && index <= range.end;

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-4">
      <pre className="font-mono text-[13px] leading-6 text-stone-800">
        {song.lines.map((line, i) => {
          if (line.type === "blank") return <div key={i}>&nbsp;</div>;
          if (line.type === "section") {
            const sectionRange = sectionRanges?.get(i);
            return (
              <div key={i} className="mt-2 flex items-center gap-2">
                <span className="font-sans text-xs font-semibold uppercase tracking-wide text-teal-700">
                  {line.name}
                </span>
                {sectionRange && onPlaySection && (
                  <button
                    onClick={() => onPlaySection(sectionRange)}
                    title={`Escuchar ${line.name} (${sectionRange.end - sectionRange.start + 1} acordes)`}
                    className="no-print rounded-full border border-teal-200 px-1.5 font-sans text-[11px] text-teal-700 hover:bg-teal-50"
                  >
                    ▶
                  </button>
                )}
              </div>
            );
          }
          if (line.type === "lyric") {
            return <div key={i}>{line.text}</div>;
          }
          // Línea de acordes: reconstruir con espacios para mantener columnas
          let cursor = 0;
          const parts: React.ReactNode[] = [];
          line.tokens.forEach((token, j) => {
            const pad = Math.max(token.charIndex - cursor, j === 0 ? 0 : 1);
            if (pad > 0) parts.push(<span key={`p${j}`}>{" ".repeat(pad)}</span>);
            cursor = Math.max(token.charIndex, cursor + pad) + token.raw.length;
            if (token.chord && token.occurrenceIndex !== undefined) {
              const occ = optimized.get(token.occurrenceIndex);
              const isPlaying = playingIndex === token.occurrenceIndex;
              const selected = inRange(token.occurrenceIndex);
              const isSelected = selectedIndex === token.occurrenceIndex;
              const isSameSymbol =
                selectedSymbol !== null && token.chord.normalized === selectedSymbol;
              parts.push(
                <button
                  key={j}
                  data-occ={token.occurrenceIndex}
                  onClick={() => onChordClick(token.occurrenceIndex!)}
                  title={
                    rangeMode
                      ? "Marcar como límite de la parte a reproducir"
                      : occ
                        ? `${occ.voicing.display} — clic para escuchar y ver posiciones`
                        : token.raw
                  }
                  className={`rounded px-0.5 font-semibold transition-colors ${
                    isPlaying
                      ? "bg-teal-600 text-white"
                      : selected
                        ? "bg-teal-100 text-teal-900 ring-1 ring-teal-400"
                        : isSelected
                          ? "bg-teal-700 text-white"
                          : isSameSymbol
                            ? "bg-teal-100 text-teal-900"
                            : occ?.locked
                              ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                              : rangeMode
                                ? "text-teal-700 outline-dashed outline-1 outline-teal-300 hover:bg-teal-50"
                                : "text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {token.raw}
                </button>,
              );
            } else {
              parts.push(
                <span key={j} className={token.error ? "text-rose-600 underline decoration-wavy" : "text-stone-400"}>
                  {token.raw}
                </span>,
              );
            }
          });
          return <div key={i}>{parts}</div>;
        })}
      </pre>
    </div>
  );
}
