/* Script de diagnóstico: npx vitest run no lo toma (no es .test.ts). Se corre con tsx. */
import { readFileSync } from "fs";
import { parseSong } from "../song-parser";
import { detectKey } from "../key-detect";
import { optimizeProgression } from "../optimizer";

const html = readFileSync(process.argv[2], "utf8");

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}
function stripTags(s: string): string {
  return decodeEntities(s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""));
}
const pres = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)].map((m) => stripTags(m[1]));
const text = pres.reduce((a, b) => (b.length > a.length ? b : a)).trim();

console.log("=== TEXTO IMPORTADO (primeras 40 líneas) ===");
console.log(text.split("\n").slice(0, 40).join("\n"));

const song = parseSong(text);
console.log("\n=== ACORDES ÚNICOS ===");
console.log(song.uniqueChords.map((c) => c.normalized).join("  "));
console.log("total ocurrencias:", song.occurrences.length);
console.log("errores:", song.errors);

const key = detectKey(song.occurrences.map((o) => o.chord));
console.log("\n=== TONALIDAD ===");
console.log(key);

const result = optimizeProgression(song.occurrences);
console.log("\n=== VOICINGS ELEGIDOS (primeras 25 ocurrencias) ===");
for (const o of result.occurrences.slice(0, 25)) {
  const v = o.voicing;
  console.log(
    `${o.occurrence.chord.normalized.padEnd(8)} ${v.display.padEnd(10)} notas=${v.noteNames.join(",").padEnd(20)} bajo=${v.bassNote.padEnd(3)} ${v.inversion}${v.omitted.length ? " OMITE " + v.omitted.join(",") : ""}`,
  );
}
console.log("\n=== FORMAS POR ACORDE ===");
for (const [sym, list] of result.chordShapes) {
  console.log(sym.padEnd(8), list.map((v) => v.display).join("  "));
}

console.log("\n=== SECUENCIA COMPLETA ===");
console.log(song.occurrences.map((o) => o.chord.normalized).join(" "));
