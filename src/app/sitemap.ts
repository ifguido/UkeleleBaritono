import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import { TOOL_ROUTES } from "@/lib/seo/routes";
import { NOTES, QUALITIES, SCALE_SLUGS } from "@/lib/seo/slugs";

/**
 * Fecha de última revisión del contenido, a mano.
 *
 * Tentaba usar `new Date()`, pero eso marca las ~900 URLs como modificadas en
 * cada deploy aunque no haya cambiado una coma. Google aprende rápido a
 * ignorar un `lastmod` que miente, y ahí se pierde la señal justo cuando de
 * verdad se actualiza algo. Se sube esta constante cuando cambia el contenido.
 */
const CONTENT_UPDATED_AT = new Date("2026-08-04");

/**
 * Cualidades y escalas que concentran casi todas las búsquedas. Se les da más
 * prioridad para que el rastreador llegue primero a ellas: con ~900 URLs, el
 * orden en que Google las descubre decide qué se indexa en las primeras semanas.
 */
const CORE_QUALITIES = new Set(["major", "minor", "7", "m7", "maj7", "sus4", "sus2", "dim", "aug", "m7b5", "6", "9"]);
const CORE_SCALES = new Set([
  "major",
  "aeolian",
  "pentatonicMinor",
  "pentatonicMajor",
  "bluesMinor",
  "dorian",
  "mixolydian",
  "harmonicMinor",
  "melodicMinor",
  "lydian",
]);

export default function sitemap(): MetadataRoute.Sitemap {
  const tools: MetadataRoute.Sitemap = TOOL_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: "weekly",
    priority: route.priority,
  }));

  const chords: MetadataRoute.Sitemap = NOTES.flatMap((note) =>
    QUALITIES.map((quality) => ({
      url: absoluteUrl(`/acordes/${note.slug}-${quality.slug}`),
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: "monthly" as const,
      priority: CORE_QUALITIES.has(quality.id) ? 0.8 : 0.5,
    })),
  );

  const scales: MetadataRoute.Sitemap = NOTES.flatMap((note) =>
    SCALE_SLUGS.map((scale) => ({
      url: absoluteUrl(`/escalas/${note.slug}-${scale.slug}`),
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: "monthly" as const,
      priority: CORE_SCALES.has(scale.id) ? 0.8 : 0.5,
    })),
  );

  return [...tools, ...chords, ...scales];
}
