import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { JsonLd, organizationSchema, websiteSchema } from "@/lib/seo/jsonld";
import { TOOL_ROUTES } from "@/lib/seo/routes";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, TUNING_LABEL } from "@/lib/seo/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Sin esto, cualquier campo de metadatos con ruta relativa —canonical,
  // og:image— rompe el build en lugar de resolverse a una URL absoluta.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "music",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/`,
    siteName: SITE_NAME,
    locale: "es_ES",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  // Solo hace falta si se verifica la propiedad por etiqueta HTML. Si ya está
  // verificada por DNS o por el propio Vercel, la variable se deja sin definir
  // y no se emite ninguna etiqueta.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sin esto Google recorta la miniatura y no muestra los diagramas de
      // acorde en los resultados, que son justo lo que distingue estas páginas.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/**
 * El zoom queda habilitado. Estaba desactivado para evitar que iOS ampliara la
 * página al enfocar un campo, pero eso es un fallo de accesibilidad que
 * Lighthouse penaliza y que afecta a cualquiera que necesite agrandar el texto.
 * La causa real —controles con menos de 16px— se corrige en `globals.css`.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        <JsonLd schema={[websiteSchema(), organizationSchema()]} />

        <header className="no-print border-b border-stone-200 bg-white">
          {/*
            En móvil la marca va en su propia fila y los enlaces envuelven
            debajo; a partir de sm entra todo en una línea. Antes era una única
            fila sin envolver, y con seis secciones eso empujaba la página a lo
            ancho: el peor scroll horizontal es el que arrastra el contenido
            entero, no solo el menú.
          */}
          <nav
            aria-label="Principal"
            className="mx-auto max-w-5xl px-4 py-3 sm:flex sm:items-center sm:gap-6"
          >
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                Ukelele<span className="text-teal-700">Barítono</span>
              </Link>
              <span className="text-xs text-stone-400 sm:hidden">{TUNING_LABEL}</span>
            </div>

            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600 sm:mt-0">
              {TOOL_ROUTES.map((route) => (
                <li key={route.path}>
                  <Link href={route.path} className="hover:text-stone-900">
                    {route.nav}
                  </Link>
                </li>
              ))}
            </ul>

            <span className="ml-auto hidden text-xs text-stone-400 sm:block">
              Ukelele barítono · {TUNING_LABEL}
            </span>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

        {/*
          El pie repite los enlaces a las secciones a propósito: son enlaces
          presentes en todas las páginas, y con ~900 URLs generadas son el camino
          por el que el rastreador vuelve desde cualquier acorde suelto a los
          índices en lugar de quedarse en un callejón sin salida.
        */}
        <footer className="no-print border-t border-stone-200 bg-white">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
            <div>
              <p className="font-semibold text-stone-900">{SITE_NAME}</p>
              <p className="mt-2 text-stone-500">
                Motor musical determinista: cada posición se valida nota por nota, ninguna se copia
                de una tabla.
              </p>
            </div>
            <nav aria-label="Secciones">
              <p className="font-semibold text-stone-900">Herramientas</p>
              <ul className="mt-2 space-y-1 text-stone-500">
                {TOOL_ROUTES.map((route) => (
                  <li key={route.path}>
                    <Link href={route.path} className="hover:text-stone-900">
                      {route.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Atajos">
              <p className="font-semibold text-stone-900">Los más buscados</p>
              <ul className="mt-2 space-y-1 text-stone-500">
                <li>
                  <Link href="/acordes/do-mayor" className="hover:text-stone-900">
                    Acorde Do mayor (C)
                  </Link>
                </li>
                <li>
                  <Link href="/acordes/sol-mayor" className="hover:text-stone-900">
                    Acorde Sol mayor (G)
                  </Link>
                </li>
                <li>
                  <Link href="/acordes/la-menor" className="hover:text-stone-900">
                    Acorde La menor (Am)
                  </Link>
                </li>
                <li>
                  <Link href="/escalas/do-mayor" className="hover:text-stone-900">
                    Escala de Do mayor
                  </Link>
                </li>
                <li>
                  <Link href="/escalas/la-pentatonica-menor" className="hover:text-stone-900">
                    Pentatónica menor de La
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </footer>

        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
