import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";
import { NOTES, QUALITIES } from "@/lib/seo/slugs";

export const metadata: Metadata = pageMetadata({
  title: "Diccionario de acordes para ukelele barítono (D–G–B–E)",
  description:
    "Los 420 acordes del ukelele barítono (D–G–B–E) con sus posiciones y diagramas: mayores, menores, " +
    "séptimas y tensiones, en las 12 tonalidades.",
  path: "/acordes",
});

/** Las cualidades con las que se toca el 95% del repertorio. */
const ESENCIALES = new Set(["major", "minor", "7", "m7", "maj7", "sus4", "sus2", "6", "m6", "dim", "aug", "m7b5"]);

export default function Page() {
  const esenciales = QUALITIES.filter((q) => ESENCIALES.has(q.id));
  const resto = QUALITIES.filter((q) => !ESENCIALES.has(q.id));

  return (
    <div className="space-y-10">
      <Breadcrumbs trail={[{ name: "Acordes" }]} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Acordes para ukelele barítono
        </h1>
        <p className="mt-3 max-w-3xl text-stone-600">
          Las 420 combinaciones posibles —12 fundamentales por 35 tipos de acorde— con sus posiciones en la
          afinación D–G–B–E. Cada digitación se genera recorriendo el diapasón y se valida contra la fórmula
          del acorde, así que si aparece es porque contiene las notas que tiene que contener.
        </p>
      </header>

      {/*
        La tabla se abre por fundamental. Es como busca la gente ("acordes de
        Do") y de paso reparte los 420 enlaces en bloques de 35, en vez de
        volcarlos todos juntos donde ni el lector ni el rastreador distinguen
        qué importa.
      */}
      <section>
        <h2 className="text-xl font-bold tracking-tight">Los que más se usan</h2>
        <p className="mt-2 text-sm text-stone-600">
          Con estos doce tipos de acorde se toca casi cualquier canción popular.
        </p>
        <div className="mt-5 space-y-6">
          {NOTES.map((note) => (
            <div key={note.slug}>
              <h3 className="text-sm font-semibold text-stone-900">
                {note.es} <span className="font-normal text-stone-400">({note.letter})</span>
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {esenciales.map((quality) => (
                  <li key={quality.slug}>
                    <Link
                      href={`/acordes/${note.slug}-${quality.slug}`}
                      className="inline-block rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-sm hover:border-teal-600 hover:text-teal-800"
                    >
                      {note.es} {quality.es}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-200 pt-8">
        <h2 className="text-xl font-bold tracking-tight">Acordes con tensiones</h2>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">
          Novenas, oncenas, trecenas y alteraciones. En cuatro cuerdas no entran todas las notas, así que
          estas posiciones omiten alguna —casi siempre la quinta, que es la que menos define el color— y
          cada página marca cuál.
        </p>
        <div className="mt-5 space-y-6">
          {NOTES.map((note) => (
            <div key={note.slug}>
              <h3 className="text-sm font-semibold text-stone-900">
                {note.es} <span className="font-normal text-stone-400">({note.letter})</span>
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {resto.map((quality) => (
                  <li key={quality.slug}>
                    <Link
                      href={`/acordes/${note.slug}-${quality.slug}`}
                      className="inline-block rounded-lg border border-stone-200 bg-white px-2 py-0.5 text-xs text-stone-600 hover:border-teal-600 hover:text-teal-800"
                    >
                      {note.es} {quality.es}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-200 pt-8">
        <h2 className="text-xl font-bold tracking-tight">Si no encontrás lo que buscás</h2>
        <ul className="mt-3 space-y-2 text-sm text-stone-600">
          <li>
            <Link href="/explorador" className="text-teal-800 hover:underline">
              Explorador de acordes
            </Link>{" "}
            — escribí cualquier cifrado, incluidos los que llevan bajo invertido (G/B), y compará todas sus
            posiciones.
          </li>
          <li>
            <Link href="/identificador" className="text-teal-800 hover:underline">
              Identificador de digitaciones
            </Link>{" "}
            — si tenés la posición y no sabés cómo se llama.
          </li>
          <li>
            <Link href="/" className="text-teal-800 hover:underline">
              Adaptador de canciones
            </Link>{" "}
            — pegá la canción entera y te devuelvo el arreglo con las posiciones que mejor se enlazan.
          </li>
        </ul>
      </section>
    </div>
  );
}
