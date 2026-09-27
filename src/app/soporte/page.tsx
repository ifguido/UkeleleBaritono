import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Soporte y contacto",
  description:
    "Ayuda con la app y el sitio de Ukelele Barítono: cómo escribirnos, permisos del micrófono, importar canciones " +
    "con Compartir y el afinador del Apple Watch.",
  path: "/soporte",
});

const EMAIL = "farannaguido@gmail.com";

/**
 * Es la "Support URL" de la ficha del App Store. Apple (guía 1.5) exige que
 * lleve a una página con una forma real de contactar a quien desarrolla la
 * app, así que el mail tiene que estar arriba y a la vista, no al final.
 */
export default function Page() {
  return (
    <div className="space-y-8">
      <Breadcrumbs trail={[{ name: "Soporte" }]} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Soporte y contacto</h1>
        <p className="mt-3 max-w-3xl text-stone-600">
          <strong>Ukelele Barítono</strong> (sitio web y app para iPhone, Apple Watch y Android) la desarrolla y
          mantiene Guido Faranna. Si algo no funciona, encontraste un acorde mal o tenés una sugerencia, escribí a:
        </p>
        <p className="mt-4">
          <a
            href={`mailto:${EMAIL}?subject=Ukelele%20Bar%C3%ADtono`}
            className="inline-block rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white hover:bg-teal-900"
          >
            {EMAIL}
          </a>
        </p>
        <p className="mt-3 max-w-3xl text-sm text-stone-500">
          Respondemos en español o en inglés, normalmente en uno o dos días. Si es un problema de la app, contanos
          el modelo del teléfono, la versión (está en la pantalla «Acerca de») y qué estabas haciendo.
        </p>
      </header>

      <section className="max-w-3xl space-y-3 text-stone-600">
        <h2 className="text-xl font-bold tracking-tight text-stone-900">El afinador no escucha nada</h2>
        <p>
          El afinador necesita permiso para usar el micrófono. Si lo rechazaste la primera vez, activalo en
          Ajustes → Ukelele Barítono → Micrófono (en Android: Ajustes → Aplicaciones → Ukelele Barítono →
          Permisos). El audio se analiza en el dispositivo y no se graba ni se envía a ningún lado.
        </p>
      </section>

      <section className="max-w-3xl space-y-3 text-stone-600">
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Importar una canción con Compartir</h2>
        <p>
          Desde Safari, Chrome o una app de acordes, tocá Compartir y elegí <strong>Ukelele Barítono</strong>. Si
          no aparece en la lista, deslizá hasta el final, tocá «Más» y activalo. También podés copiar la dirección
          de la página y pegarla en la pestaña Canción. Importar desde una URL es lo único que necesita conexión.
        </p>
      </section>

      <section className="max-w-3xl space-y-3 text-stone-600">
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Afinador en el Apple Watch</h2>
        <p>
          Se instala junto con la app del iPhone y funciona sin el teléfono
          cerca. La primera vez pide permiso para el micrófono del reloj. La pantalla se apaga sola según el
          ajuste «Volver al reloj» del sistema.
        </p>
      </section>

      <section className="max-w-3xl space-y-3 text-stone-600">
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Canciones guardadas</h2>
        <p>
          Quedan solo en tu dispositivo: no hay cuentas ni sincronización. Si desinstalás la app, se borran. Más
          detalles en la{" "}
          <Link href="/privacidad" className="text-teal-800 hover:underline">
            política de privacidad
          </Link>
          .
        </p>
        <p>
          <Link href="/" className="text-teal-800 hover:underline">
            ← Volver al inicio
          </Link>
        </p>
      </section>
    </div>
  );
}
