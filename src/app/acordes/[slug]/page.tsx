import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import ChordDiagram from "@/components/ChordDiagram";
import { buildChordPage } from "@/lib/seo/chord-page";
import { relatedScaleIdFor } from "@/lib/seo/featured";
import { pageMetadata } from "@/lib/seo/metadata";
import { NOTES, QUALITIES, SCALE_BY_ID, allChordSlugs, parseChordSlug } from "@/lib/seo/slugs";
import { difficultyLabel } from "@/lib/ui/difficulty";
import { SCALES } from "@/lib/engine/scales";

type Params = { params: Promise<{ slug: string }> };

/** Las 420 combinaciones canónicas se prerenderizan en el build. */
export function generateStaticParams() {
  return allChordSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const route = parseChordSlug(slug);
  if (!route) return {};

  const data = buildChordPage(route);
  if (!data) return {};

  const notes = data.tones.map((tone) => tone.note).join("–");

  return pageMetadata({
    title: `Acorde ${data.spanishName} (${data.symbol}) en ukelele barítono`,
    description:
      `Cómo tocar ${data.symbol} en ukelele barítono (D–G–B–E): ${data.voicings.length} posiciones con ` +
      `diagrama, digitación recomendada y las notas del acorde (${notes}).`,
    path: `/acordes/${route.canonical}`,
    // Sin marca: el título ya es largo y con ~900 páginas conviene que el
    // recorte de Google se coma cualquier cosa antes que la keyword.
    absoluteTitle: true,
  });
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const route = parseChordSlug(slug);
  if (!route) notFound();

  // Los enarmónicos y los alias ("re-bemol-mayor", "do-m") existen porque la
  // gente los escribe, pero una sola de las grafías puede ser la indexable.
  // 308 y no 307: la equivalencia es definitiva, y solo el permanente
  // transfiere autoridad a la URL canónica.
  if (route.canonical !== slug) permanentRedirect(`/acordes/${route.canonical}`);

  const data = buildChordPage(route);
  if (!data) notFound();

  const { note, quality } = route;
  const easiest = data.voicings[0];
  const scaleId = relatedScaleIdFor(quality.id);
  const scaleMeta = SCALE_BY_ID.get(scaleId);
  const scaleFormula = SCALES[scaleId];

  return (
    <div className="space-y-10">
      <Breadcrumbs
        trail={[
          { name: "Acordes", path: "/acordes" },
          { name: `${data.spanishName} (${data.symbol})` },
        ]}
      />

      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Acorde {data.spanishName} <span className="text-stone-400">({data.symbol})</span>
        </h1>
        <p className="mt-3 max-w-3xl text-stone-600">
          {data.voicings.length}{" "}
          {data.voicings.length === 1 ? "posición verificada" : "posiciones verificadas"} de{" "}
          <strong className="text-stone-800">{data.symbol}</strong> en ukelele barítono, afinación
          D–G–B–E. Cada diagrama se calcula desde la fórmula del acorde y se comprueba nota por nota:
          ninguna sale de una tabla copiada.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-bold tracking-tight">Notas del acorde</h2>
        <p className="mt-2 text-sm text-stone-600">
          {data.symbol} es un acorde {data.chord.formula.description}. Lo forman estas notas:
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {data.tones.map((tone) => (
            <li
              key={tone.degree}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <span className="font-semibold text-stone-900">{tone.note}</span>
              <span className="ml-2 text-stone-400">grado {tone.degree}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight">Posiciones en el diapasón</h2>
        {easiest && (
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            La más cómoda es <strong className="font-mono text-stone-800">{easiest.display}</strong>{" "}
            (trastes en orden D–G–B–E, «x» = cuerda que no suena)
            {easiest.bassNote && <> con {easiest.bassNote} en el bajo</>}. Las siguientes cambian el
            registro o la inversión: sirven para enlazar mejor con el acorde anterior de la canción.
          </p>
        )}

        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.voicings.map((voicing) => {
            const diff = difficultyLabel(voicing.difficulty);
            return (
              <li
                key={voicing.display}
                className="flex flex-col items-center rounded-xl border border-stone-200 bg-white p-4"
              >
                <ChordDiagram frets={voicing.frets} barre={voicing.barre} size="lg" />
                <p className="mt-3 font-mono text-sm text-stone-700">{voicing.display}</p>
                <p className="mt-1 flex flex-wrap justify-center gap-1.5 text-xs">
                  <span className={`rounded px-1.5 py-0.5 ${diff.className}`}>{diff.text}</span>
                  {voicing.barre && (
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-600">cejilla</span>
                  )}
                  {voicing.inversion && (
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-600">
                      {voicing.inversion}
                    </span>
                  )}
                </p>
                {voicing.omitted.length > 0 && (
                  <p className="mt-1 text-center text-xs text-stone-400">
                    sin {voicing.omitted.join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-sm text-stone-600">
          ¿Querés el listado completo, ordenado por dificultad o por altura del bajo? Abrí{" "}
          <Link href="/explorador" className="text-teal-800 hover:underline">
            {data.symbol} en el explorador
          </Link>
          .
        </p>
      </section>

      {scaleMeta && scaleFormula && (
        <section>
          <h2 className="text-xl font-bold tracking-tight">Para improvisar encima</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Sobre un {data.symbol} funciona la{" "}
            <Link
              href={`/escalas/${note.slug}-${scaleMeta.slug}`}
              className="text-teal-800 hover:underline"
            >
              escala {scaleFormula.name.toLowerCase()} de {note.es}
            </Link>
            . {scaleFormula.character}
          </p>
        </section>
      )}

      {/*
        Enlazado interno. Cada página de acorde queda a un clic de las otras 11
        tonalidades y de las demás cualidades sobre la misma fundamental: es lo
        que convierte 420 páginas sueltas en una malla que el rastreador puede
        recorrer entera desde cualquier punto.
      */}
      <section className="border-t border-stone-200 pt-8">
        <h2 className="text-xl font-bold tracking-tight">
          {quality.es.charAt(0).toUpperCase() + quality.es.slice(1)} en otras tonalidades
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {NOTES.filter((other) => other.pc !== note.pc).map((other) => (
            <li key={other.slug}>
              <Link
                href={`/acordes/${other.slug}-${quality.slug}`}
                className="inline-block rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-teal-600 hover:text-teal-800"
              >
                {other.es} {quality.es}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight">Otros acordes de {note.es}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {QUALITIES.filter((other) => other.id !== quality.id).map((other) => (
            <li key={other.slug}>
              <Link
                href={`/acordes/${note.slug}-${other.slug}`}
                className="inline-block rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 hover:border-teal-600 hover:text-teal-800"
              >
                {note.es} {other.es}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
