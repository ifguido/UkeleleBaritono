"use client";

import { useMemo, useState } from "react";
import { parseChordFlexible } from "@/lib/engine/chords";
import { Voicing, VoicingOptions, generateVoicings, recommendScore } from "@/lib/engine/voicings";
import VoicingCard from "@/components/VoicingCard";

type SortKey = "recommended" | "easiest" | "lowestBass" | "highest" | "complete" | "noMuted";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recomendados" },
  { value: "easiest", label: "Más fáciles" },
  { value: "lowestBass", label: "Bajo más grave" },
  { value: "highest", label: "Registro agudo" },
  { value: "complete", label: "Más completos" },
  { value: "noMuted", label: "Sin cuerdas silenciadas" },
];

function sortVoicings(list: Voicing[], key: SortKey): Voicing[] {
  const copy = [...list];
  switch (key) {
    case "easiest":
      return copy.sort((a, b) => a.difficulty - b.difficulty);
    case "lowestBass":
      return copy.sort((a, b) => a.bassMidi - b.bassMidi);
    case "highest":
      return copy.sort((a, b) => b.topMidi - a.topMidi);
    case "complete":
      return copy.sort(
        (a, b) => a.omitted.length - b.omitted.length || a.difficulty - b.difficulty,
      );
    case "noMuted":
      return copy.sort((a, b) => a.mutedCount - b.mutedCount || a.difficulty - b.difficulty);
    default:
      return copy.sort((a, b) => recommendScore(a) - recommendScore(b));
  }
}

export default function ExplorerPage() {
  const [query, setQuery] = useState("C#m7");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [options, setOptions] = useState<VoicingOptions>({});
  const [showAll, setShowAll] = useState(false);

  const parsed = useMemo(() => parseChordFlexible(query), [query]);
  const voicings = useMemo(() => {
    if (!parsed.ok) return [];
    return generateVoicings(parsed.chord, options);
  }, [parsed, options]);

  const sorted = useMemo(() => sortVoicings(voicings, sort), [voicings, sort]);
  const visible = showAll ? sorted : sorted.slice(0, 12);

  const setOpt = (patch: VoicingOptions) => setOptions((o) => ({ ...o, ...patch }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Explorador de acordes</h1>
        <p className="text-sm text-stone-500">
          Todas las posiciones válidas en el diapasón, generadas y verificadas nota por nota.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="C#m7, G/B, Mim9…"
          className="w-44 rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-lg outline-none focus:border-teal-600"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          {showFilters ? "▲ Filtros" : "▼ Filtros"}
        </button>
        {parsed.ok && (
          <span className="ml-auto text-sm text-stone-500">
            {parsed.chord.normalized} — {parsed.chord.formula.description} ·{" "}
            {voicings.length} posiciones
          </span>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm sm:grid-cols-3">
          <label className="flex items-center justify-between gap-2">
            <span>Traste máximo</span>
            <input
              type="number"
              min={3}
              max={15}
              value={options.maxFret ?? 12}
              onChange={(e) => setOpt({ maxFret: Number(e.target.value) })}
              className="w-16 rounded border border-stone-300 px-2 py-1"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span>Mínimo de cuerdas</span>
            <input
              type="number"
              min={2}
              max={4}
              value={options.minStrings ?? 3}
              onChange={(e) => setOpt({ minStrings: Number(e.target.value) })}
              className="w-16 rounded border border-stone-300 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.requireRootInBass ?? false}
              onChange={(e) => setOpt({ requireRootInBass: e.target.checked })}
            />
            <span>Fundamental en el bajo</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.allowInversions ?? true}
              onChange={(e) => setOpt({ allowInversions: e.target.checked })}
            />
            <span>Permitir inversiones</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.allowMuted ?? true}
              onChange={(e) => setOpt({ allowMuted: e.target.checked })}
            />
            <span>Cuerdas silenciadas</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.allowOmittedFifth ?? true}
              onChange={(e) => setOpt({ allowOmittedFifth: e.target.checked })}
            />
            <span>Permitir omitir la quinta</span>
          </label>
        </div>
      )}

      {!parsed.ok && query.trim() && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {parsed.error.message}
        </div>
      )}

      {parsed.ok && voicings.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          No encontré posiciones tocables con estos filtros. Probá subir el traste máximo o permitir
          cuerdas silenciadas.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((v) => (
          <VoicingCard key={v.display} symbol={parsed.ok ? parsed.chord.normalized : ""} voicing={v} compact />
        ))}
      </div>

      {!showAll && sorted.length > 12 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full rounded-lg border border-stone-300 py-2 text-sm text-stone-600 hover:bg-stone-100"
        >
          Ver las {sorted.length - 12} posiciones restantes
        </button>
      )}
    </div>
  );
}
