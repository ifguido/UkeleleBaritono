"use client";

import { useState } from "react";
import { OptimizeMode } from "@/lib/engine/optimizer";
import { VoicingOptions } from "@/lib/engine/voicings";

export interface Settings {
  mode: OptimizeMode;
  voicingOptions: VoicingOptions;
}

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
}

const MODES: { value: OptimizeMode; label: string; hint: string }[] = [
  { value: "auto", label: "Automático", hint: "equilibrio entre comodidad y sonido" },
  { value: "easy", label: "Fácil", hint: "posiciones abiertas y trastes bajos" },
  { value: "balanced", label: "Equilibrado", hint: "comodidad, buen bajo y conducción de voces" },
  { value: "faithful", label: "Fiel", hint: "acordes completos, bajos e inversiones originales" },
  { value: "advanced", label: "Avanzado", hint: "permite posiciones altas y cejillas" },
];

export default function AdvancedSettings({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const vo = settings.voicingOptions;

  const setVo = (patch: VoicingOptions) =>
    onChange({ ...settings, voicingOptions: { ...vo, ...patch } });

  return (
    <div className="no-print rounded-lg border border-stone-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-stone-600 hover:text-stone-900"
      >
        <span>Opciones avanzadas</span>
        <span className="text-xs">{open ? "▲ ocultar" : "▼ mostrar"}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-stone-200 px-4 py-4 text-sm">
          <div>
            <div className="mb-1.5 font-medium text-stone-700">Modo de arreglo</div>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  title={m.hint}
                  onClick={() => onChange({ ...settings, mode: m.value })}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    settings.mode === m.value
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-stone-300 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-stone-400">
              {MODES.find((m) => m.value === settings.mode)?.hint}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-2">
              <span>Traste máximo</span>
              <input
                type="number"
                min={3}
                max={15}
                value={vo.maxFret ?? 12}
                onChange={(e) => setVo({ maxFret: Number(e.target.value) })}
                className="w-16 rounded border border-stone-300 px-2 py-1"
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>Mínimo de cuerdas</span>
              <input
                type="number"
                min={2}
                max={4}
                value={vo.minStrings ?? 3}
                onChange={(e) => setVo({ minStrings: Number(e.target.value) })}
                className="w-16 rounded border border-stone-300 px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={vo.requireRootInBass ?? false}
                onChange={(e) => setVo({ requireRootInBass: e.target.checked })}
              />
              <span>Fundamental siempre en el bajo</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={vo.allowInversions ?? true}
                onChange={(e) => setVo({ allowInversions: e.target.checked })}
              />
              <span>Permitir inversiones</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={vo.allowMuted ?? true}
                onChange={(e) => setVo({ allowMuted: e.target.checked })}
              />
              <span>Permitir cuerdas silenciadas</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={vo.allowOmittedFifth ?? true}
                onChange={(e) => setVo({ allowOmittedFifth: e.target.checked })}
              />
              <span>Permitir omitir la quinta</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
