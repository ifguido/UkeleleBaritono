import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Baritone Chords",
  description:
    "Adaptá canciones al ukelele barítono (D-G-B-E): posiciones correctas, diagramas y arreglos optimizados.",
};

// Evita el zoom automático de iOS al enfocar inputs y el pinch-zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <header className="no-print border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Baritone<span className="text-teal-700">Chords</span>
            </Link>
            <div className="flex gap-4 text-sm text-stone-600">
              <Link href="/" className="hover:text-stone-900">
                Canción
              </Link>
              <Link href="/explorador" className="hover:text-stone-900">
                Explorador
              </Link>
              <Link href="/identificador" className="hover:text-stone-900">
                Identificador
              </Link>
            </div>
            <span className="ml-auto hidden text-xs text-stone-400 sm:block">
              Ukelele barítono · D–G–B–E
            </span>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="no-print border-t border-stone-200 py-4 text-center text-xs text-stone-400">
          Motor musical determinista: cada posición se valida nota por nota.
        </footer>
      </body>
    </html>
  );
}
