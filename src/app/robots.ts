import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";

/**
 * `/api/import` queda fuera del índice: es un endpoint que sale a buscar HTML de
 * terceros, así que rastrearlo gasta presupuesto de crawl en respuestas que no
 * son páginas y encima dispara peticiones salientes por cada visita del bot.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
