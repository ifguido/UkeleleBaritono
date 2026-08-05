import type { Metadata } from "next";
import Link from "next/link";
import ExplorerClient from "./ExplorerClient";
import Breadcrumbs from "@/components/Breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Explorador de acordes para ukelele barítono",
  description:
    "Escribí cualquier cifrado (C#m7, Fmaj9, G7sus4) y mirá todas sus posiciones en el ukelele barítono, " +
    "ordenadas por dificultad. Con diagrama y sonido.",
  path: "/explorador",
});

export default function Page() {
  return (
    <div className="space-y-8">
      <Breadcrumbs trail={[{ name: "Explorador de acordes" }]} />

      <ExplorerClient />

      <section className="no-print border-t border-stone-200 pt-8">
        <h2 className="text-xl font-bold tracking-tight">Cómo leer los resultados</h2>
        <div className="mt-3 max-w-3xl space-y-3 text-sm text-stone-600">
          <p>
            Un mismo acorde tiene muchas digitaciones válidas, y ninguna es «la correcta»: cambian el bajo,
            el registro, la dificultad y qué notas quedan al aire. El explorador las genera todas y te deja
            ordenarlas por el criterio que te sirva en esa canción.
          </p>
          <p>
            Cuando un acorde tiene más notas que cuerdas —de la novena para arriba— hay que omitir alguna.
            El generador sacrifica primero la quinta, que es la que menos define el color del acorde, y te
            marca cuál omitió en cada posición.
          </p>
          <p>
            Si ya sabés qué acorde buscás y querés la página completa con todas sus posiciones, entrá por el{" "}
            <Link href="/acordes" className="text-teal-800 hover:underline">
              diccionario de acordes
            </Link>
            . Si tenés la digitación y no sabés qué acorde es, usá el{" "}
            <Link href="/identificador" className="text-teal-800 hover:underline">
              identificador
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
