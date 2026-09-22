import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Política de privacidad",
  description:
    "Qué datos usan el sitio y la app de Ukelele Barítono, y cuáles no: el micrófono del afinador se analiza " +
    "en tu dispositivo y las canciones guardadas no salen de él.",
  path: "/privacidad",
});

/** Fecha de la última revisión del texto. Se actualiza a mano cuando cambia. */
const UPDATED = "21 de septiembre de 2026";

/**
 * La política existe sobre todo por la app: App Store y Google Play exigen una
 * URL pública de privacidad, y la ficha de la app enlaza acá. Está escrita
 * para que la lea una persona, no para cubrirse: dice exactamente qué se hace
 * con el micrófono y con las canciones, que es lo único que a alguien le
 * puede preocupar.
 */
export default function Page() {
  return (
    <div className="space-y-8">
      <Breadcrumbs trail={[{ name: "Privacidad" }]} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Política de privacidad</h1>
        <p className="mt-2 text-sm text-stone-500">Última actualización: {UPDATED}</p>
        <p className="mt-3 max-w-3xl text-stone-600">
          Esta política cubre el sitio www.ukelelebaritone.com y la aplicación <strong>Ukelele Barítono</strong> para
          iOS y Android. La versión corta: no hay cuentas, no hay registro, no se venden ni se comparten datos, y
          lo que hace la herramienta lo hace en tu dispositivo.
        </p>
      </header>

      <section className="max-w-3xl space-y-3 text-stone-600">
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Micrófono</h2>
        <p>
          El afinador pide acceso al micrófono para escuchar la cuerda que estás tocando. El audio se analiza
          en el momento, en tu teléfono o navegador, para calcular la altura de la nota. <strong>No se graba,
          no se guarda y no se envía a ningún servidor.</strong> Cuando detenés el afinador (o la app pasa a
          segundo plano), el micrófono se apaga.
        </p>
      </section>

      <section className="max-w-3xl space-y-3 text-stone-600">
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Canciones guardadas</h2>
        <p>
          Las canciones que guardás en el adaptador quedan almacenadas únicamente en tu dispositivo (en el
          navegador o en la app). No se sincronizan con ningún servicio ni las vemos nosotros. Si borrás los
          datos del sitio o desinstalás la app, desaparecen.
        </p>
      </section>

      <section className="max-w-3xl space-y-3 text-stone-600">
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Importar una canción desde una URL</h2>
        <p>
          Si pegás la dirección de una página de acordes, esa dirección (y solo esa) se envía a nuestro servidor,
          que descarga la página y devuelve el texto de la canción. No se guarda un historial de las direcciones
          consultadas.
        </p>
      </section>

      <section className="max-w-3xl space-y-3 text-stone-600">
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Estadísticas del sitio web</h2>
        <p>
          El sitio web usa Vercel Analytics y Speed Insights, que registran visitas de forma agregada y sin
          cookies ni identificadores persistentes. <strong>La aplicación móvil no incluye ninguna herramienta de
          analítica ni de publicidad.</strong>
        </p>
      </section>

      <section className="max-w-3xl space-y-3 text-stone-600">
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Menores y contacto</h2>
        <p>
          La herramienta no está dirigida específicamente a menores y no recoge datos personales de nadie. Si
          tenés una consulta sobre esta política, escribinos a{" "}
          <a href="mailto:farannaguido@gmail.com" className="text-teal-800 hover:underline">
            farannaguido@gmail.com
          </a>
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
