import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo/site";

/**
 * Manifest de aplicación web. Habilita «Añadir a pantalla de inicio», que en un
 * afinador importa: se abre a pantalla completa y sin barra del navegador, que
 * es como se usa con el instrumento en la mano.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#0f766e",
    lang: "es",
    categories: ["music", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // "any maskable" deja que Android recorte el icono a la forma del sistema
      // sin comerse el mástil: por eso las variantes llevan margen alrededor.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
