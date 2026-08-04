import type { Metadata } from "next";
import Link from "next/link";
import FinderClient from "./FinderClient";
import Breadcrumbs from "@/components/Breadcrumbs";
import { JsonLd, howToSchema } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Identificador de acordes por digitación",
  description:
    "¿Qué acorde estás tocando? Escribí los trastes que pisás en el ukelele barítono (D–G–B–E) y te digo " +
    "qué acorde es, con sus nombres alternativos e inversiones.",
  path: "/identificador",
});

const STEPS = [
  {
    name: "Contá los trastes de cada cuerda",
    text:
      "Mirá qué traste pisás en cada cuerda, de la más grave (Re) a la más aguda (Mi). Una cuerda al aire " +
      "es 0 y una cuerda que no suena es x.",
  },
  {
    name: "Escribilos en orden D–G–B–E",
    text:
      "Anotá los cuatro valores separados por guiones, siempre de grave a aguda. Por ejemplo 2-1-0-0, o " +
      "x-6-5-4 si la cuerda más grave queda silenciada.",
  },
  {
    name: "Leé el resultado",
    text:
      "El identificador devuelve el acorde que forman esas notas. Si la misma combinación tiene más de una " +
      "lectura válida, aparecen todas ordenadas por cuál es la interpretación más probable.",
  },
];

export default function Page() {
  return (
    <div className="space-y-8">
      <Breadcrumbs trail={[{ name: "Identificador de digitaciones" }]} />
      <JsonLd
        schema={howToSchema(
          "Cómo identificar un acorde de ukelele barítono a partir de la digitación",
          "Tres pasos para saber qué acorde forma una posición cualquiera en la afinación D–G–B–E.",
          STEPS,
        )}
      />

      <FinderClient />

      <section className="no-print border-t border-stone-200 pt-8">
        <h2 className="text-xl font-bold tracking-tight">Cómo anotar la digitación</h2>
        <ol className="mt-3 max-w-3xl list-decimal space-y-2 pl-5 text-sm text-stone-600">
          {STEPS.map((step) => (
            <li key={step.name}>
              <strong className="text-stone-800">{step.name}.</strong> {step.text}
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-3xl text-sm text-stone-600">
          Un mismo puñado de notas puede tener más de un nombre según cuál consideres la fundamental: un
          La menor séptima y un Do con sexta comparten las cuatro notas. Por eso el identificador muestra
          las lecturas alternativas en vez de elegir una sola. Para el camino inverso —del nombre a la
          posición— está el{" "}
          <Link href="/acordes" className="text-teal-800 hover:underline">
            diccionario de acordes
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
