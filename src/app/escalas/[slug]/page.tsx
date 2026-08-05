import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import PlayableChord from "@/components/PlayableChord";
import { ChordCell, buildScalePage } from "@/lib/seo/scale-page";
import { fitDescription, pageMetadata } from "@/lib/seo/metadata";
import { NOTES, SCALE_SLUGS, allScaleSlugs, parseScaleSlug } from "@/lib/seo/slugs";

type Params = { params: Promise<{ slug: string }> };

/** Las 432 combinaciones canónicas se prerenderizan en el build. */
export function generateStaticParams() {
  return allScaleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const route = parseScaleSlug(slug);
  if (!route) return {};

  const data = buildScalePage(route);
  if (!data) return {};

  const notes = data.scale.notes.map((note) => note.name).join("–");

  return pageMetadata({
    title: `Escala de ${data.spanishName} en ukelele barítono`,
    // Las notas van primero entre lo opcional porque son lo que distingue esta
    // página de las otras 431; en una cromática con dobles bemoles no caben, y
    // ahí se cae esa cláusula en lugar de recortar la frase a la mitad.
    description: fitDescription(
      `${data.spanishName} en ukelele barítono (D–G–B–E).`,
      `Notas ${notes}.`,
      "Digitaciones, acordes de la escala y progresiones para practicarla.",
    ),
    path: `/escalas/${route.canonical}`,
    absoluteTitle: true,
  });
}

/** Nombre del acorde: enlaza a su página y suena al pulsar el altavoz. */
function ChordEntry({ chord }: { chord: ChordCell }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {chord.slug ? (
        <Link href={`/acordes/${chord.slug}`} className="font-medium text-teal-800 hover:underline">
          {chord.symbol}
        </Link>
      ) : (
        <span className="font-medium">{chord.symbol}</span>
      )}
      {chord.midiNotes && (
        <PlayableChord
          midiNotes={chord.midiNotes}
          label={chord.symbol}
          className="px-1 text-xs leading-none text-stone-400 hover:text-teal-700"
        >
          ▶
        </PlayableChord>
      )}
    </span>
  );
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const route = parseScaleSlug(slug);
  if (!route) notFound();
  if (route.canonical !== slug) permanentRedirect(`/escalas/${route.canonical}`);

  const data = buildScalePage(route);
  if (!data) notFound();

  const { note, scale: scaleMeta } = route;
  const { scale, degrees, progressions } = data;

  return (
    <div className="space-y-10">
      <Breadcrumbs
        trail={[{ name: "Escalas", path: "/escalas" }, { name: data.spanishName }]}
      />

      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Escala de {data.spanishName}
        </h1>
        <p className="mt-3 max-w-3xl text-stone-600">{scale.formula.character}</p>
        <p className="mt-2 max-w-3xl text-stone-600">{scale.formula.usage}</p>
      </header>

      <section>
        <h2 className="text-xl font-bold tracking-tight">Las notas</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {scale.notes.map((scaleNote) => (
            <li
              key={scaleNote.index}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <span className="font-semibold text-stone-900">{scaleNote.name}</span>
              <span className="ml-2 text-stone-400">{scaleNote.degree}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-stone-600">
          Para verla sobre el diapasón, con las digitaciones por posición y el sonido de cada nota, abrila
          en el{" "}
          <Link href="/escalas" className="text-teal-800 hover:underline">
            visor de escalas
          </Link>
          .
        </p>
      </section>

      {degrees.length > 0 && (
        <section>
          <h2 className="text-xl font-bold tracking-tight">Acordes de la escala</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Apilando terceras sobre cada grado salen estos acordes. Son los que suenan «dentro» de la
            tonalidad: la base para armar una progresión que no se salga de {data.spanishName}.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="py-2 pr-4 font-semibold">Grado</th>
                  <th className="py-2 pr-4 font-semibold">Tríada</th>
                  <th className="py-2 pr-4 font-semibold">Con séptima</th>
                  <th className="py-2 font-semibold">Cifrado</th>
                </tr>
              </thead>
              <tbody>
                {degrees.map((degree) => (
                  <tr key={degree.note.index} className="border-b border-stone-100">
                    <td className="py-2 pr-4 text-stone-500">
                      {degree.note.name} <span className="text-stone-400">({degree.note.degree})</span>
                    </td>
                    <td className="py-2 pr-4">
                      {degree.triad ? (
                        <ChordEntry chord={degree.triad} />
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {degree.seventh ? (
                        <ChordEntry chord={degree.seventh} />
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-2 font-mono text-xs text-stone-500">
                      {degree.triad?.roman ?? degree.seventh?.roman ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {progressions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold tracking-tight">Progresiones para practicarla</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Vueltas de acordes que dejan sonar la escala tal como es. Tocá la progresión y puntéale
            {" "}{data.spanishName} encima.
          </p>
          <ul className="mt-4 space-y-4">
            {progressions.map((progression) => (
              <li key={progression.name} className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="font-semibold text-stone-900">{progression.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {progression.chords.map((chord, i) => (
                    <span key={`${chord.symbol}-${i}`} className="text-sm">
                      <ChordEntry chord={chord} />
                      <span className="ml-1 font-mono text-xs text-stone-400">{chord.roman}</span>
                    </span>
                  ))}
                </div>
                {progression.note && <p className="mt-2 text-xs text-stone-500">{progression.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Malla interna: las 11 tonalidades restantes y las otras 35 escalas sobre
        la misma tónica. Con 432 páginas, sin estos enlaces cada una sería una
        hoja aislada a la que solo se llega desde el sitemap.
      */}
      <section className="border-t border-stone-200 pt-8">
        <h2 className="text-xl font-bold tracking-tight">
          {scale.formula.name} en otras tonalidades
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {NOTES.filter((other) => other.pc !== note.pc).map((other) => (
            <li key={other.slug}>
              <Link
                href={`/escalas/${other.slug}-${scaleMeta.slug}`}
                className="inline-block rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-teal-600 hover:text-teal-800"
              >
                {other.es}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight">Otras escalas de {note.es}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {SCALE_SLUGS.filter((other) => other.id !== scaleMeta.id).map((other) => (
            <li key={other.slug}>
              <Link
                href={`/escalas/${note.slug}-${other.slug}`}
                className="inline-block rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 hover:border-teal-600 hover:text-teal-800"
              >
                {other.slug.replace(/-/g, " ")}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
