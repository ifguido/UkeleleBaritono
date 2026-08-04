"use client";

import { useMemo, useState } from "react";
import { identifyChord } from "@/lib/engine/identify";
import { parseFretString } from "@/lib/engine/voicings";
import ChordDiagram from "@/components/ChordDiagram";
import { playChord } from "@/lib/audio/synth";

export default function FinderPage() {
  const [input, setInput] = useState("2-1-0-0");

  const frets = useMemo(() => parseFretString(input), [input]);
  const result = useMemo(() => (frets ? identifyChord(frets) : null), [frets]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Identificador de digitaciones</h1>
        <p className="text-sm text-stone-500">
          Escribí los trastes en orden D–G–B–E (x = cuerda silenciada) y te digo qué acorde estás
          tocando.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="2-1-0-0 o x-6-5-4"
          className="w-48 rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-lg outline-none focus:border-teal-600"
        />
        {frets && result && result.matches.length > 0 && (
          <button
            onClick={() => playChord(result.matches[0].voicing.midiNotes)}
            className="rounded-lg border border-teal-700 px-3 py-2 text-sm text-teal-800 hover:bg-teal-50"
          >
            ▶ Escuchar
          </button>
        )}
      </div>

      {!frets && input.trim() && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Formato inválido. Usá cuatro valores separados por guiones, por ejemplo: 2-1-0-0 o x-6-5-4.
        </div>
      )}

      {frets && result && (
        <div className="flex flex-wrap items-start gap-6">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <ChordDiagram frets={frets} size="lg" />
            <p className="mt-1 text-center text-sm text-stone-500">
              Notas: <span className="font-mono">{result.noteNames.join(" ") || "—"}</span>
            </p>
          </div>

          <div className="min-w-64 flex-1 space-y-2">
            {result.matches.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Estas notas no forman ningún acorde que conozca. Puede ser un cluster o faltar una
                nota que lo defina.
              </div>
            )}
            {result.matches.slice(0, 8).map((m, i) => (
              <div
                key={m.symbol}
                className={`rounded-lg border p-3 ${
                  i === 0 ? "border-teal-600 bg-teal-50/50 ring-1 ring-teal-600" : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{m.symbol}</span>
                  {i === 0 && <span className="text-xs font-medium text-teal-700">mejor interpretación</span>}
                  <span className="ml-auto text-xs text-stone-400">
                    confianza {(m.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-stone-600">
                  {m.exact ? "Acorde completo" : `Parcial — omite ${m.omitted.join(", ")}`}
                  {" · "}
                  {m.inversion}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
