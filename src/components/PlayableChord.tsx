"use client";

import { useRef } from "react";
import { Midi } from "@/lib/engine/notes";
import { playArpeggio, playChord, preloadAudio } from "@/lib/audio/synth";

interface Props {
  /** Notas que suenan, de la cuerda más grave a la más aguda. */
  midiNotes: Midi[];
  /** Qué se está tocando, para quien navegue con lector de pantalla. */
  label: string;
  /** Mantener pulsado reproduce el arpegio en lugar del rasgueo. */
  arpeggioOnHold?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Milisegundos de pulsación a partir de los cuales se arpegia. */
const HOLD_MS = 350;

/**
 * Hace sonar un acorde al pulsar sobre él.
 *
 * El truco está en que el diagrama llega como `children`: se renderiza en el
 * servidor y este componente solo le añade el gesto. Si en cambio dibujara el
 * SVG por su cuenta, los diagramas dejarían de estar en el HTML inicial y las
 * páginas de acorde perderían justo aquello que las hace distintas en los
 * resultados de búsqueda.
 */
export default function PlayableChord({
  midiNotes,
  label,
  arpeggioOnHold = true,
  className = "",
  children,
}: Props) {
  const pressedAt = useRef<number | null>(null);

  // El audio se prepara al acercar el cursor, no al pulsar: decodificar los
  // samples lleva su tiempo y hacerlo recién en el clic se oye como un retardo.
  const warmUp = () => preloadAudio();

  const press = () => {
    pressedAt.current = performance.now();
  };

  const release = () => {
    const held = pressedAt.current === null ? 0 : performance.now() - pressedAt.current;
    pressedAt.current = null;
    if (arpeggioOnHold && held >= HOLD_MS) playArpeggio(midiNotes);
    else playChord(midiNotes);
  };

  return (
    <button
      type="button"
      aria-label={`Escuchar ${label}`}
      title={`Escuchar ${label}${arpeggioOnHold ? " (mantené pulsado para el arpegio)" : ""}`}
      onPointerEnter={warmUp}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={() => (pressedAt.current = null)}
      // El teclado no distingue pulsación corta de larga: siempre rasguea.
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          playChord(midiNotes);
        }
      }}
      className={`cursor-pointer rounded-lg transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${className}`}
    >
      {children}
    </button>
  );
}
