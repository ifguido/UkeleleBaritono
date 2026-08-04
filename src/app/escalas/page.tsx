"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FAMILY_LABELS,
  SCALES,
  Scale,
  buildScale,
  parseScaleQuery,
  parentRootOf,
  relatedScales,
  scalesByFamily,
} from "@/lib/engine/scales";
import {
  ScalePosition,
  fretboardNotes,
  generatePositions,
  threeNotesPerString,
} from "@/lib/engine/scale-fretboard";
import { BARITONE, PC_NAMES_FLAT, PC_NAMES_SHARP } from "@/lib/engine/notes";
import { playMelody, preloadAudio } from "@/lib/audio/synth";
import FretboardDiagram, { fretKey } from "@/components/FretboardDiagram";
import ScaleBoxDiagram from "@/components/ScaleBoxDiagram";
import TabStaff from "@/components/TabStaff";
import ScaleChords from "@/components/ScaleChords";
import ScaleProgressions from "@/components/ScaleProgressions";
import ScalePractice from "@/components/ScalePractice";

const TABS = [
  { id: "diapason", label: "Diapasón" },
  { id: "puntear", label: "Puntear" },
  { id: "acordes", label: "Acordes" },
  { id: "progresiones", label: "Progresiones" },
  { id: "variaciones", label: "Variaciones" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const MAX_FRET = 15;
const FAMILY_GROUPS = scalesByFamily();

/** Altura más grave del mástil donde cae la tónica, con una octava por encima. */
function tonicMidi(scale: Scale): number {
  const lowest = BARITONE.strings[0];
  for (let midi = lowest; midi < lowest + 12; midi++) {
    if (((midi % 12) + 12) % 12 === scale.root) return midi;
  }
  return lowest;
}

export default function ScalesPage() {
  const [rootName, setRootName] = useState("A");
  const [scaleId, setScaleId] = useState("bluesMinor");
  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("diapason");
  const [labelMode, setLabelMode] = useState<"degree" | "note">("degree");
  const [useSharps, setUseSharps] = useState(false);
  const [positionKind, setPositionKind] = useState<"cajas" | "tres">("cajas");
  const [positionIndex, setPositionIndex] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showOnlyBox, setShowOnlyBox] = useState(true);
  const playRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    preloadAudio();
  }, []);
  useEffect(() => () => playRef.current?.cancel(), []);

  const scale = useMemo(
    () => buildScale(rootName, scaleId) ?? buildScale("C", "major")!,
    [rootName, scaleId],
  );

  const notes = useMemo(() => fretboardNotes(scale, BARITONE, MAX_FRET), [scale]);
  const boxes = useMemo(() => generatePositions(scale, { maxFret: MAX_FRET }), [scale]);
  const threeNps = useMemo(() => threeNotesPerString(scale, { maxFret: MAX_FRET }), [scale]);

  // No toda escala admite tres notas por cuerda: si la elegida no las tiene,
  // se muestran las cajas sin tocar la preferencia del usuario.
  const kind = positionKind === "tres" && threeNps.length === 0 ? "cajas" : positionKind;
  const positions: ScalePosition[] = kind === "cajas" ? boxes : threeNps;
  const position: ScalePosition | null =
    positions[Math.min(positionIndex, positions.length - 1)] ?? null;

  const stop = () => {
    playRef.current?.cancel();
    playRef.current = null;
    setActiveKey(null);
  };

  /** Cambiar de escala reinicia la caja elegida: los índices no se comparan. */
  const selectScale = (root: string, id: string) => {
    stop();
    setRootName(root);
    setScaleId(id);
    setQuery("");
    setQueryError(null);
    setPositionIndex(0);
  };

  const playMidis = (midis: number[], keys: (string | null)[], noteMs = 260) => {
    stop();
    playRef.current = playMelody(midis, noteMs, (i) => setActiveKey(keys[i] ?? null));
    setTimeout(stop, midis.length * noteMs + 700);
  };

  const playOneOctave = () => {
    const base = tonicMidi(scale);
    const midis = [...scale.notes.map((n) => base + n.semitones), base + 12];
    playMidis(midis, midis.map(() => null), 280);
  };

  const playPosition = (descending = false) => {
    if (!position) return;
    const path = descending ? [...position.path].reverse() : position.path;
    playMidis(path.map((n) => n.midi), path.map(fretKey), 240);
  };

  const applyQuery = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setQueryError(null);
      return;
    }
    const result = parseScaleQuery(text);
    if (result.ok && result.scale) {
      stop();
      setRootName(result.scale.rootName);
      setScaleId(result.scale.formula.id);
      setPositionIndex(0);
      setQueryError(null);
    } else {
      setQueryError(result.message ?? null);
    }
  };

  const related = useMemo(() => relatedScales(scale), [scale]);
  const parent = useMemo(() => parentRootOf(scale), [scale]);
  const highlight = useMemo(
    () => (tab === "diapason" && !showOnlyBox) || !position ? null : new Set(position.path.map(fretKey)),
    [tab, showOnlyBox, position],
  );

  const tonicNames = useMemo(
    () => (useSharps ? PC_NAMES_SHARP : PC_NAMES_FLAT).map((_, pc) =>
      useSharps ? PC_NAMES_SHARP[pc] : PC_NAMES_FLAT[pc],
    ),
    [useSharps],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Escalas</h1>
        <p className="text-sm text-stone-500">
          Cualquier escala sobre el mástil del barítono: dónde está cada nota, cómo puntearla, qué
          acordes salen de ella y cómo variarla. Todo calculado desde los intervalos.
        </p>
      </div>

      {/* Selector */}
      <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => applyQuery(e.target.value)}
            placeholder="A blues, Do menor armónica, F# lidio…"
            className="w-64 rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-teal-600"
          />
          <select
            value={scaleId}
            onChange={(e) => selectScale(rootName, e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
          >
            {FAMILY_GROUPS.map((group) => (
              <optgroup key={group.family} label={FAMILY_LABELS[group.family]}>
                {group.scales.map((formula) => (
                  <option key={formula.id} value={formula.id}>
                    {formula.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="ml-auto text-sm text-stone-500">
            {Object.keys(SCALES).length} escalas
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {tonicNames.map((name, pc) => {
            const selected = scale.root === pc;
            return (
              <button
                key={pc}
                onClick={() => selectScale(name, scaleId)}
                className={`min-w-10 rounded px-2 py-1 font-mono text-sm ${
                  selected
                    ? "bg-teal-700 font-semibold text-white"
                    : "border border-stone-300 text-stone-600 hover:bg-stone-100"
                }`}
              >
                {name}
              </button>
            );
          })}
          <button
            onClick={() => {
              const next = !useSharps;
              setUseSharps(next);
              setRootName(
                next ? PC_NAMES_SHARP[scale.root] : PC_NAMES_FLAT[scale.root],
              );
            }}
            title="Cambiar entre sostenidos y bemoles"
            className="ml-2 rounded border border-stone-300 px-2 py-1 text-sm text-stone-600 hover:bg-stone-100"
          >
            {useSharps ? "♯" : "♭"}
          </button>
        </div>

        {queryError && <p className="text-sm text-rose-700">{queryError}</p>}
      </div>

      {/* Ficha de la escala */}
      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-2xl font-bold">
            {scale.rootName} {scale.formula.name}
          </h2>
          <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
            {FAMILY_LABELS[scale.formula.family]}
          </span>
          <span className="text-sm text-stone-400">{scale.notes.length} notas</span>
          <button
            onClick={playOneOctave}
            className="ml-auto rounded border border-teal-600 px-3 py-1 text-sm text-teal-800 hover:bg-teal-600 hover:text-white"
          >
            ▶ Escuchar una octava
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {scale.notes.map((note) => (
            <div
              key={note.index}
              className={`rounded-lg border px-2.5 py-1 text-center ${
                note.index === 0
                  ? "border-teal-600 bg-teal-50 text-teal-900"
                  : "border-stone-200 bg-stone-50"
              }`}
            >
              <div className="text-base font-semibold leading-tight">{note.name}</div>
              <div className="font-mono text-[11px] text-stone-500">{note.degree}</div>
            </div>
          ))}
        </div>

        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-stone-400">Fórmula</dt>
            <dd className="font-mono">{scale.notes.map((n) => n.degree).join(" ")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-stone-400">Suena</dt>
            <dd className="text-stone-700">{scale.formula.character}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-stone-400">Se usa</dt>
            <dd className="text-stone-700">{scale.formula.usage}</dd>
          </div>
          {parent && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-stone-400">Es</dt>
              <dd className="text-stone-700">
                el {scale.formula.mode!.degree}º modo de{" "}
                <strong>
                  {parent.rootName} {parent.formula.name.toLowerCase()}
                </strong>{" "}
                — mismas notas, otro centro.
              </dd>
            </div>
          )}
        </dl>

        {related.length > 0 && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Escalas hermanas
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {related.map((rel) => (
                <button
                  key={`${rel.rootName}-${rel.formula.id}`}
                  onClick={() => selectScale(rel.rootName, rel.formula.id)}
                  title={rel.note}
                  className={`rounded-full border px-2.5 py-1 text-xs hover:bg-stone-100 ${
                    rel.kind === "padre"
                      ? "border-teal-300 bg-teal-50 text-teal-900"
                      : "border-stone-300 text-stone-600"
                  }`}
                >
                  {rel.rootName} {rel.formula.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Pestañas */}
      <div className="no-print flex flex-wrap gap-1 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm ${
              tab === t.id
                ? "border-teal-700 font-semibold text-teal-800"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Diapasón */}
      {tab === "diapason" && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-stone-300 bg-white p-0.5 text-sm">
              {(["degree", "note"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setLabelMode(m)}
                  className={`rounded px-3 py-1 ${
                    labelMode === m ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {m === "degree" ? "Grados" : "Notas"}
                </button>
              ))}
            </div>
            {position && (
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={showOnlyBox}
                  onChange={(e) => setShowOnlyBox(e.target.checked)}
                  className="accent-teal-700"
                />
                Resaltar {position.label.split(" · ")[0].toLowerCase()}
              </label>
            )}
            <span className="ml-auto text-xs text-stone-400">
              Tocá cualquier punto para escucharlo
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-3">
            <FretboardDiagram
              notes={notes}
              maxFret={MAX_FRET}
              labelMode={labelMode}
              highlight={highlight}
              active={activeKey}
              onNoteClick={(note) => playMidis([note.midi], [fretKey(note)], 500)}
            />
          </div>

          <p className="text-sm text-stone-500">
            Los puntos en teal son la tónica: son las notas donde la frase &ldquo;llega a casa&rdquo;.
            Fijate que el mismo dibujo se repite doce trastes más arriba.
          </p>
        </section>
      )}

      {/* Puntear */}
      {tab === "puntear" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-stone-300 bg-white p-0.5 text-sm">
              <button
                onClick={() => {
                  setPositionKind("cajas");
                  setPositionIndex(0);
                }}
                className={`rounded px-3 py-1 ${
                  kind === "cajas" ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                Cajas ({boxes.length})
              </button>
              <button
                onClick={() => {
                  setPositionKind("tres");
                  setPositionIndex(0);
                }}
                disabled={threeNps.length === 0}
                className={`rounded px-3 py-1 disabled:opacity-40 ${
                  kind === "tres" ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                3 por cuerda ({threeNps.length})
              </button>
            </div>
            <p className="text-sm text-stone-500">
              {kind === "cajas"
                ? "Una caja por cada nota de la escala en la 4ª cuerda: la mano no se mueve."
                : "Tres notas en cada cuerda: cambia de cuerda siempre en el mismo lugar del compás."}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {positions.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setPositionIndex(i)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  i === positionIndex
                    ? "border-teal-600 bg-teal-50 font-medium text-teal-800"
                    : "border-stone-300 text-stone-600 hover:bg-stone-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {position ? (
            <>
              <div className="flex flex-wrap items-start gap-4 rounded-lg border border-teal-600 bg-teal-50/40 p-4">
                <div className="rounded-lg bg-white p-2">
                  <ScaleBoxDiagram position={position} labelMode="finger" active={activeKey} />
                  <p className="mt-1 text-center text-[11px] text-stone-400">dedos</p>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <ScaleBoxDiagram position={position} labelMode="degree" active={activeKey} />
                  <p className="mt-1 text-center text-[11px] text-stone-400">grados</p>
                </div>
                <div className="min-w-56 flex-1 space-y-1 text-sm text-stone-700">
                  <div className="text-lg font-semibold">{position.label}</div>
                  <div>
                    {position.noteCount} notas · {position.rootCount}{" "}
                    {position.rootCount === 1 ? "tónica" : "tónicas"} · abarca{" "}
                    {(position.range / 12).toFixed(1)} octavas
                  </div>
                  <div className="text-stone-500">
                    Apertura de {position.span} trastes
                    {position.stretch && " — hay que estirar"}
                    {position.usesOpen && " · usa cuerdas al aire"}
                  </div>
                  <div className="text-stone-500">
                    Empieza en el grado <span className="font-mono">{position.startDegree}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => playPosition(false)}
                      className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
                    >
                      ▶ Subir
                    </button>
                    <button
                      onClick={() => playPosition(true)}
                      className="rounded border border-teal-600 px-3 py-1.5 text-sm text-teal-800 hover:bg-teal-50"
                    >
                      ▼ Bajar
                    </button>
                    <button
                      onClick={stop}
                      className="rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
                    >
                      ■ Parar
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-3">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  La caja en tablatura, de la nota más grave a la más aguda
                </h3>
                <TabStaff
                  notes={position.path}
                  activeIndex={
                    activeKey ? position.path.findIndex((n) => fretKey(n) === activeKey) : null
                  }
                  grouping={4}
                  footer="degree"
                  onNoteClick={(i) => playMidis([position.path[i].midi], [fretKey(position.path[i])], 500)}
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-3">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Dónde cae en el mástil
                </h3>
                <FretboardDiagram
                  notes={notes}
                  maxFret={MAX_FRET}
                  labelMode="degree"
                  highlight={new Set(position.path.map(fretKey))}
                  active={activeKey}
                  onNoteClick={(note) => playMidis([note.midi], [fretKey(note)], 500)}
                />
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No encontré posiciones cómodas para esta escala en el barítono.
            </p>
          )}
        </section>
      )}

      {tab === "acordes" && <ScaleChords scale={scale} />}
      {tab === "progresiones" && <ScaleProgressions scale={scale} />}
      {tab === "variaciones" &&
        (position ? (
          <ScalePractice scale={scale} position={position} onActiveNote={setActiveKey} />
        ) : (
          <p className="text-sm text-stone-500">
            Elegí primero una caja en la pestaña Puntear.
          </p>
        ))}
    </div>
  );
}
