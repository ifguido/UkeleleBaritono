import type { Metadata } from "next";
import Link from "next/link";
import TunerClient from "./TunerClient";
import Breadcrumbs from "@/components/Breadcrumbs";
import { JsonLd, faqSchema, howToSchema } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Afinador de ukelele barítono online (D–G–B–E)",
  description:
    "Afiná tu ukelele barítono con el micrófono, gratis y sin instalar nada. Modo por cuerdas para D–G–B–E " +
    "y modo cromático, con precisión en cents.",
  path: "/afinador",
});

const STEPS = [
  {
    name: "Permití el micrófono",
    text:
      "El navegador va a pedirte acceso al micrófono. El audio se analiza en tu dispositivo y no se envía a " +
      "ningún servidor.",
  },
  {
    name: "Tocá una cuerda al aire",
    text:
      "Pulsá una sola cuerda y dejala sonar. El afinador detecta contra qué cuerda de D–G–B–E se parece más " +
      "y te dice si está alta o baja.",
  },
  {
    name: "Corregí hasta que quede centrada",
    text:
      "Girá la clavija en la dirección que indica la aguja. La cuerda se da por afinada cuando se mantiene " +
      "centrada un momento, no con un pico suelto.",
  },
  {
    name: "Repetí y volvé a revisar",
    text:
      "Afinar una cuerda mueve la tensión del mástil y desafina un poco las demás. Después de la cuarta, " +
      "volvé a pasar por la primera.",
  },
];

const FAQ = [
  {
    question: "¿En qué notas se afina el ukelele barítono?",
    answer:
      "En D3–G3–B3–E4 (Re–Sol–Si–Mi), de la cuerda más grave a la más aguda. Es la misma afinación que las " +
      "cuatro cuerdas agudas de la guitarra.",
  },
  {
    question: "¿Por qué mi barítono se desafina apenas lo afino?",
    answer:
      "Suele ser cuerdas nuevas todavía estirándose, que pueden tardar varios días en asentarse. También " +
      "influyen los cambios de temperatura y humedad. Si una sola cuerda se va siempre, revisá que esté bien " +
      "enrollada en la clavija y que no se trabe en la cejuela.",
  },
  {
    question: "¿Qué es el A4 y para qué lo cambiaría?",
    answer:
      "Es la frecuencia de referencia del La central, 440 Hz por defecto. Solo conviene moverlo si tocás con " +
      "alguien que usa otra referencia, por ejemplo un piano afinado en 442.",
  },
  {
    question: "¿Puedo afinar sin micrófono?",
    answer:
      "Sí: el afinador reproduce cada cuerda para que la iguales de oído. Es más lento y menos preciso que " +
      "el micrófono, pero funciona en un lugar ruidoso o si preferís no dar permisos.",
  },
];

export default function Page() {
  return (
    <div className="space-y-8">
      <Breadcrumbs trail={[{ name: "Afinador" }]} />
      <JsonLd
        schema={[
          howToSchema(
            "Cómo afinar un ukelele barítono en D–G–B–E",
            "Afinado paso a paso con el micrófono del navegador, sin instalar nada.",
            STEPS,
          ),
          faqSchema(FAQ),
        ]}
      />

      <TunerClient />

      <section className="no-print border-t border-stone-200 pt-8">
        <h2 className="text-xl font-bold tracking-tight">Cómo afinar un ukelele barítono</h2>
        <ol className="mt-3 max-w-3xl list-decimal space-y-2 pl-5 text-sm text-stone-600">
          {STEPS.map((step) => (
            <li key={step.name}>
              <strong className="text-stone-800">{step.name}.</strong> {step.text}
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-3xl text-sm text-stone-600">
          Con el instrumento afinado, el resto del sitio se vuelve fiable: las posiciones del{" "}
          <Link href="/acordes" className="text-teal-800 hover:underline">
            diccionario de acordes
          </Link>{" "}
          y las digitaciones de las{" "}
          <Link href="/escalas" className="text-teal-800 hover:underline">
            escalas
          </Link>{" "}
          asumen D–G–B–E exacto.
        </p>
      </section>

      <section className="no-print">
        <h2 className="text-xl font-bold tracking-tight">Preguntas frecuentes</h2>
        <dl className="mt-3 max-w-3xl space-y-4 text-sm">
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
