import { NextRequest, NextResponse } from "next/server";

/**
 * Importador de canciones desde páginas de acordes.
 * Mejor esfuerzo: si el HTML del sitio cambia o bloquea el scraping,
 * devolvemos un error claro y el usuario pega el texto a mano.
 */

const FALLBACK =
  "No pude importar esa página automáticamente. Copiá el texto de la canción y pegalo en el editor: la entrada manual siempre funciona.";

function decodeEntities(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""));
}

/** Ultimate Guitar: JSON embebido en div.js-store */
function extractUltimateGuitar(html: string): string | null {
  const m = /class="js-store"\s+data-content="([^"]+)"/.exec(html);
  if (!m) return null;
  try {
    const json = JSON.parse(decodeEntities(m[1]));
    const content: unknown =
      json?.store?.page?.data?.tab_view?.wiki_tab?.content;
    if (typeof content !== "string" || !content.trim()) return null;
    return content
      .replace(/\[\/?ch\]/g, "")
      .replace(/\[\/?tab\]/g, "")
      .trim();
  } catch {
    return null;
  }
}

/** Genérico (sirve para CifraClub, LaCuerda y la mayoría): el <pre> más largo. */
function extractLargestPre(html: string): string | null {
  const pres = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)].map((m) => stripTags(m[1]));
  if (pres.length === 0) return null;
  const best = pres.reduce((a, b) => (b.length > a.length ? b : a));
  return best.trim() || null;
}

function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (!m) return null;
  return decodeEntities(m[1])
    .replace(/\s*[|–-]\s*(cifra club|lacuerda|ultimate guitar|acordes.*|chords.*)$/i, "")
    .trim();
}

export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = await req.json();
    url = String(body.url ?? "");
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Esa URL no es válida." }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { error: `La página respondió con error ${res.status}. ${FALLBACK}` },
        { status: 422 },
      );
    }

    const html = await res.text();
    const text = extractUltimateGuitar(html) ?? extractLargestPre(html);
    if (!text || text.length < 20) {
      return NextResponse.json({ error: FALLBACK }, { status: 422 });
    }

    const title = extractTitle(html);
    const withTitle = title ? `Título: ${title}\n\n${text}` : text;
    return NextResponse.json({ text: withTitle, source: parsedUrl.hostname });
  } catch {
    return NextResponse.json({ error: FALLBACK }, { status: 422 });
  }
}
