"use client";

import { useMemo, useState } from "react";
import { Scale } from "@/lib/engine/scales";
import {
  ScaleChord,
  chordsInScale,
  harmonizeScale,
  homeChord,
} from "@/lib/engine/scale-harmony";
import { ParsedChord } from "@/lib/engine/chords";
import { Voicing, generateVoicings } from "@/lib/engine/voicings";
import { playArpeggio, playChord } from "@/lib/audio/synth";
import ChordDiagram from "./ChordDiagram";

/** Los voicings de un acorde no cambian nunca: se calculan una sola vez. */
const voicingCache = new Map<string, Voicing | null>();

export function bestVoicing(chord: ParsedChord): Voicing | null {
  const key = chord.normalized;
  if (voicingCache.has(key)) return voicingCache.get(key)!;
  const voicings = generateVoicings(chord);
  const best = voicings[0] ?? null;
  voicingCache.set(key, best);
  return best;
}

function ChordCell({ chord, subtitle }: { chord: ScaleChord; subtitle?: string }) {
  const voicing = useMemo(() => bestVoicing(chord.chord), [chord]);
  return (
    <div className="flex flex-col items-center rounded-lg border border-stone-200 bg-white p-2">
      <div className="flex w-full items-baseline justify-between gap-1">
        <span className="font-semibold">{chord.symbol}</span>
        <span className="font-mono text-[11px] text-teal-700">{chord.roman}</span>
      </div>
      {subtitle && <span className="self-start text-[10px] text-stone-400">{subtitle}</span>}
      {voicing ? (
        <>
          <button
            onClick={() => playChord(voicing.midiNotes)}
            title={`Escuchar ${chord.symbol}`}
            className="my-1"
          >
            <ChordDiagram frets={voicing.frets} barre={voicing.barre} size="sm" />
          </button>
          <span className="font-mono text-[11px] text-stone-500">{voicing.display}</span>
          {voicing.omitted.length > 0 && (
            <span className="text-center text-[10px] text-orange-700">
              omite {voicing.omitted.map((o) => o.split(" ")[0]).join(", ")}
            </span>
          )}
        </>
      ) : (
        <span className="my-4 text-center text-[11px] text-stone-400">
          No entra en cuatro cuerdas
        </span>
      )}
    </div>
  );
}

export default function ScaleChords({ scale }: { scale: Scale }) {
  const [showAll, setShowAll] = useState(false);
  const [openDegree, setOpenDegree] = useState<number | null>(null);

  const home = useMemo(() => homeChord(scale), [scale]);
  const homeVoicing = useMemo(() => (home ? bestVoicing(home.chord) : null), [home]);
  const harmonized = useMemo(() => harmonizeScale(scale), [scale]);
  const groups = useMemo(() => chordsInScale(scale), [scale]);

  const totalChords = groups.reduce((sum, g) => sum + g.chords.length, 0);

  return (
    <div className="space-y-6">
      {/* Acorde casa */}
      {home && (
        <section className="rounded-lg border border-teal-600 bg-teal-50/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            El acorde de la escala
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {homeVoicing && (
              <button onClick={() => playChord(homeVoicing.midiNotes)} title="Escuchar">
                <ChordDiagram frets={homeVoicing.frets} barre={homeVoicing.barre} size="lg" />
              </button>
            )}
            <div className="min-w-0 flex-1 text-sm text-stone-700">
              <div className="text-xl font-bold">{home.symbol}</div>
              <p className="text-stone-500">{home.description}</p>
              <p className="mt-1">
                Es el acorde sobre el que <strong>{scale.name}</strong> suena como en casa. Si estás
                improvisando y no sabés dónde parar, parás acá.
              </p>
              {homeVoicing && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => playChord(homeVoicing.midiNotes)}
                    className="rounded border border-teal-600 px-3 py-1 text-sm text-teal-800 hover:bg-teal-600 hover:text-white"
                  >
                    ▶ Rasgueo
                  </button>
                  <button
                    onClick={() => playArpeggio(homeVoicing.midiNotes)}
                    className="rounded border border-stone-300 px-3 py-1 text-sm text-stone-600 hover:bg-stone-100"
                  >
                    ♪ Arpegio
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Armonización por terceras */}
      {harmonized.length > 0 ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Armonización — un acorde sobre cada grado
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Apilando notas de la escala de tres en tres. Estos son los acordes que{" "}
            <em>pertenecen</em> a {scale.name}: una canción construida con ellos se puede puntear
            entera con esta escala.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {harmonized.map((h) => (
              <div key={h.note.index} className="space-y-2">
                <div className="text-center text-xs font-semibold text-stone-500">
                  {h.note.degree} · {h.note.name}
                </div>
                {h.triad ? (
                  <ChordCell chord={h.triad} />
                ) : (
                  <div className="rounded-lg border border-dashed border-stone-300 p-2 text-center text-[11px] text-stone-400">
                    {h.triadNotes.join("-")}
                    <br />
                    sin nombre estándar
                  </div>
                )}
                {h.seventh && <ChordCell chord={h.seventh} subtitle="con séptima" />}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Armonización
          </h3>
          <p className="mt-1">
            {scale.formula.name} tiene {scale.notes.length} notas: apilar terceras no da acordes
            reconocibles. Mirá abajo qué acordes entran enteros en la escala — esa es la lista útil
            para esta escala.
          </p>
        </section>
      )}

      {/* Todos los acordes compatibles */}
      <section>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-sm font-medium text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline"
        >
          {showAll ? "▲ Ocultar" : "▼ Ver"} los {totalChords} acordes que entran enteros en la escala
        </button>
        <p className="mt-1 text-sm text-stone-500">
          Todo acorde cuyas notas están todas en {scale.name}. Es la respuesta a &ldquo;¿sobre qué
          acordes puedo tocar esto?&rdquo;.
        </p>
        {showAll && (
          <div className="mt-3 space-y-2">
            {groups.map((group) => (
              <div key={group.note.index} className="rounded-lg border border-stone-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-semibold text-stone-700">
                    {group.note.degree}
                  </span>
                  <span className="text-sm font-medium">{group.note.name}</span>
                  <span className="text-xs text-stone-400">{group.chords.length} acordes</span>
                  <button
                    onClick={() =>
                      setOpenDegree(openDegree === group.note.index ? null : group.note.index)
                    }
                    className="ml-auto text-xs text-stone-500 hover:text-stone-800"
                  >
                    {openDegree === group.note.index ? "▲ diagramas" : "▼ diagramas"}
                  </button>
                </div>
                {group.chords.length === 0 && (
                  <p className="mt-1 text-xs text-stone-400">
                    Ningún acorde completo arranca en esta nota: es una nota de paso, se toca
                    yendo hacia otra.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.chords.map((chord) => (
                    <button
                      key={chord.symbol}
                      onClick={() => {
                        const voicing = bestVoicing(chord.chord);
                        if (voicing) playChord(voicing.midiNotes);
                      }}
                      title={`${chord.roman} — ${chord.description}`}
                      className="rounded border border-stone-300 px-2 py-1 text-xs hover:border-teal-600 hover:bg-teal-50"
                    >
                      {chord.symbol}
                    </button>
                  ))}
                </div>
                {openDegree === group.note.index && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {group.chords.map((chord) => (
                      <ChordCell key={chord.symbol} chord={chord} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
