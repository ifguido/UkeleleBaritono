import type { Metadata } from "next";
import Link from "next/link";
import ScalesClient from "./ScalesClient";
import Breadcrumbs from "@/components/Breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";
import { scalesByFamily } from "@/lib/engine/scales";
import { NOTES, SCALE_BY_ID } from "@/lib/seo/slugs";
import { featuredRootFor } from "@/lib/seo/featured";

export const metadata: Metadata = pageMetadata({
  title: "Escalas y modos para ukelele barítono",
  description:
    "36 escalas y modos en las 12 tonalidades para ukelele barítono (D–G–B–E): diapasón, digitaciones, " +
    "acordes de cada escala y progresiones.",
  path: "/escalas",
});

export default function Page() {
  const families = scalesByFamily();

  return (
    <div className="space-y-10">
      <Breadcrumbs trail={[{ name: "Escalas" }]} />

      <ScalesClient />

      {/*
        Índice completo de escalas. Es la puerta de entrada del rastreador a las
        432 páginas de escala: desde acá se llega a las 36 en su tonalidad más
        habitual, y cada una de esas enlaza a las 11 restantes.
      */}
      <section className="no-print border-t border-stone-200 pt-10">
        <h2 className="text-2xl font-bold tracking-tight">Todas las escalas</h2>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">
          Cada escala tiene su página con el diapasón, las digitaciones por posición, los acordes que salen
          de ella y progresiones para practicarla. Están disponibles en las 12 tonalidades; abajo enlazamos
          la más habitual de cada una.
        </p>

        <div className="mt-6 space-y-8">
          {families.map((family) => (
            <div key={family.family}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                {family.label}
              </h3>
              <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {family.scales.map((formula) => {
                  const meta = SCALE_BY_ID.get(formula.id);
                  if (!meta) return null;
                  const note = featuredRootFor(formula);
                  return (
                    <li key={formula.id} className="text-sm">
                      <Link
                        href={`/escalas/${note.slug}-${meta.slug}`}
                        className="text-teal-800 hover:underline"
                      >
                        {note.es} {formula.name.toLowerCase()}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="no-print">
        <h2 className="text-2xl font-bold tracking-tight">Por tonalidad</h2>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">
          Si ya sabés en qué tono está la canción, entrá por la tónica y elegí la escala desde ahí.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {NOTES.map((note) => (
            <li key={note.slug}>
              <Link
                href={`/escalas/${note.slug}-mayor`}
                className="inline-block rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-teal-600 hover:text-teal-800"
              >
                {note.es} <span className="text-stone-400">({note.letter})</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
