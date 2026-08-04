import type { Metadata } from "next";
import Link from "next/link";
import SongClient from "./SongClient";
import { JsonLd, faqSchema, webApplicationSchema } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { TOOL_ROUTES } from "@/lib/seo/routes";
import { SITE_DESCRIPTION } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "Ukelele barítono: acordes, escalas y afinador (D–G–B–E)",
  description:
    "Todo para tocar el ukelele barítono en afinación D–G–B–E: adaptador de canciones, 420 acordes con sus " +
    "digitaciones, 36 escalas en las 12 tonalidades y afinador por micrófono. Gratis y sin registro.",
  path: "/",
  absoluteTitle: true,
});

/**
 * Preguntas reales de quien recién agarra un barítono. Van con FAQPage porque
 * son las consultas con las que la gente llega desde Google: si la respuesta ya
 * aparece desplegada en el resultado, el clic es nuestro y no del foro de turno.
 */
const FAQ = [
  {
    question: "¿En qué afinación va el ukelele barítono?",
    answer:
      "El barítono va afinado en D–G–B–E (Re–Sol–Si–Mi), de la cuerda más grave a la más aguda. Son " +
      "exactamente las cuatro cuerdas agudas de una guitarra, una cuarta justa por debajo del ukelele " +
      "soprano, concierto o tenor, que van en G–C–E–A.",
  },
  {
    question: "¿Puedo usar acordes de ukelele soprano en un barítono?",
    answer:
      "No directamente: la misma forma da un acorde distinto. Una forma de Do en soprano suena como Sol en " +
      "barítono, porque la afinación está una cuarta justa más abajo. Sí podés usar tal cual las posiciones " +
      "de las cuatro cuerdas agudas de la guitarra, que son idénticas.",
  },
  {
    question: "¿Sirven los acordes de guitarra en el ukelele barítono?",
    answer:
      "Sí, siempre que uses solo las cuatro cuerdas agudas (Re, Sol, Si, Mi). Las posiciones se trasladan sin " +
      "cambiar nada. Lo que se pierde son las notas graves de las dos cuerdas que el barítono no tiene, así " +
      "que a veces conviene buscar una inversión que deje mejor el bajo.",
  },
  {
    question: "¿Cuántos acordes necesito para empezar?",
    answer:
      "Con Do, Sol, La menor y Fa ya se toca una cantidad enorme de canciones populares: son los cuatro " +
      "acordes de la progresión I–V–vi–IV. Sumando Re menor, Mi menor y Re ya cubrís la mayoría del " +
      "repertorio en tonalidades cómodas.",
  },
  {
    question: "¿Hace falta instalar algo para usar el afinador?",
    answer:
      "No. El afinador funciona en el navegador con el micrófono del dispositivo y no envía el audio a ningún " +
      "servidor: el análisis de altura ocurre entero en tu equipo.",
  },
];

export default function Page() {
  return (
    <div className="space-y-12">
      <JsonLd schema={[webApplicationSchema(SITE_DESCRIPTION), faqSchema(FAQ)]} />

      <SongClient />

      {/*
        Contenido de la portada. No es relleno para el buscador: es lo que
        responde a quien llega buscando "ukelele barítono" sin saber todavía qué
        cambia respecto del soprano, y a la vez reparte enlaces internos hacia
        las secciones y hacia las páginas de acorde más buscadas.
      */}
      <section className="no-print border-t border-stone-200 pt-10">
        <h2 className="text-2xl font-bold tracking-tight">Qué es el ukelele barítono</h2>
        <div className="mt-4 max-w-3xl space-y-4 text-stone-600">
          <p>
            El barítono es el más grave de la familia del ukelele y el único que no se afina en G–C–E–A.
            Va en <strong className="text-stone-800">D–G–B–E</strong>, las mismas cuatro cuerdas agudas de
            una guitarra, lo que lo vuelve el puente natural entre los dos instrumentos: cualquier posición
            de guitarra que use solo esas cuerdas funciona tal cual.
          </p>
          <p>
            Esa misma ventaja es la que complica encontrar material. Casi todo lo que se publica de ukelele
            está pensado para soprano, y las formas no se trasladan: lo que en soprano es un Do, en barítono
            suena Sol. Copiar un diagrama de la afinación equivocada es el error más común, y no se nota
            hasta que la canción entera suena una cuarta corrida.
          </p>
          <p>
            Todo lo que hay acá se calcula para D–G–B–E y se verifica nota por nota contra la fórmula del
            acorde: si una posición aparece, es porque contiene las notas que tiene que contener. Nada sale
            de una tabla copiada.
          </p>
        </div>
      </section>

      <section className="no-print">
        <h2 className="text-2xl font-bold tracking-tight">Herramientas</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {TOOL_ROUTES.filter((route) => route.path !== "/").map((route) => (
            <li key={route.path} className="rounded-xl border border-stone-200 bg-white p-4">
              <Link href={route.path} className="font-semibold text-teal-800 hover:underline">
                {route.name}
              </Link>
              <p className="mt-1 text-sm text-stone-500">{route.blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="no-print">
        <h2 className="text-2xl font-bold tracking-tight">Preguntas frecuentes</h2>
        <dl className="mt-4 max-w-3xl space-y-5">
          {FAQ.map((item) => (
            <div key={item.question}>
              <dt className="font-semibold text-stone-900">{item.question}</dt>
              <dd className="mt-1 text-stone-600">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
