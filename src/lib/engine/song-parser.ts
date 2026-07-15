/**
 * Parser de canciones pegadas: acordes sobre letra o formato [E]inline.
 * Preserva el layout original tanto como sea posible.
 */

import { ParsedChord, parseChord, parseChordFlexible } from "./chords";

export interface ChordToken {
  raw: string;
  charIndex: number;
  chord: ParsedChord | null;
  error?: string;
  /** Índice dentro de la secuencia global de acordes de la canción. */
  occurrenceIndex?: number;
  /** Duración explícita en tiempos, si el usuario anotó "E*2". */
  beats?: number;
}

export type SongLine =
  | { type: "chords"; text: string; tokens: ChordToken[] }
  | { type: "lyric"; text: string }
  | { type: "section"; text: string; name: string }
  | { type: "blank"; text: string };

export interface ChordOccurrence {
  index: number;
  chord: ParsedChord;
  lineIndex: number;
  charIndex: number;
  sectionName: string | null;
  /** Si el usuario editó este acorde, el símbolo que tenía originalmente. */
  originalSymbol?: string;
  /** Duración explícita en tiempos ("E*2" → 2). */
  beats?: number;
}

export interface ParsedSong {
  title: string | null;
  artist: string | null;
  lines: SongLine[];
  occurrences: ChordOccurrence[];
  /** Acordes únicos por símbolo normalizado, en orden de aparición. */
  uniqueChords: ParsedChord[];
  /** Tokens que parecían acordes pero no se pudieron interpretar. */
  errors: string[];
}

/**
 * Ediciones de acordes hechas por el usuario sobre la canción.
 * `bySymbol` reemplaza todas las apariciones de un símbolo (clave: normalizado
 * ORIGINAL); `byOccurrence` reemplaza una aparición puntual y tiene prioridad.
 */
export interface ChordEdits {
  bySymbol: Record<string, string>;
  byOccurrence: Record<number, string>;
}

export const EMPTY_EDITS: ChordEdits = { bySymbol: {}, byOccurrence: {} };

/**
 * Aplica las ediciones sobre una canción recién parseada, devolviendo una
 * copia con acordes y tokens reemplazados. Las ediciones inválidas se
 * reportan y se ignoran (nunca rompen la canción).
 */
export function applyChordEdits(
  song: ParsedSong,
  edits: ChordEdits | undefined,
): { song: ParsedSong; errors: string[] } {
  if (
    !edits ||
    (Object.keys(edits.bySymbol).length === 0 && Object.keys(edits.byOccurrence).length === 0)
  ) {
    return { song, errors: [] };
  }
  const errors: string[] = [];
  const lines = song.lines.map((line) =>
    line.type === "chords" ? { ...line, tokens: line.tokens.map((t) => ({ ...t })) } : line,
  );
  const occurrences = song.occurrences.map((o) => ({ ...o }));
  const uniqueMap = new Map<string, ParsedChord>();

  for (const occ of occurrences) {
    const original = occ.chord.normalized;
    const replacement = edits.byOccurrence[occ.index] ?? edits.bySymbol[original];
    if (replacement && replacement !== original) {
      const parsed = parseChordFlexible(replacement);
      if (parsed.ok) {
        occ.chord = parsed.chord;
        occ.originalSymbol = original;
        const line = lines[occ.lineIndex];
        if (line.type === "chords") {
          const token = line.tokens.find((t) => t.occurrenceIndex === occ.index);
          if (token) {
            token.chord = parsed.chord;
            token.raw = replacement.trim();
          }
        }
      } else {
        errors.push(parsed.error.message);
      }
    }
    if (!uniqueMap.has(occ.chord.normalized)) uniqueMap.set(occ.chord.normalized, occ.chord);
  }

  return {
    song: { ...song, lines, occurrences, uniqueChords: [...uniqueMap.values()] },
    errors: [...new Set(errors)],
  };
}

/** Tokens que no cuentan como acorde ni como letra en una línea de acordes. */
const SEPARATOR_RE = /^(\|+|x\d+|\d+x|\(x?\d+x?\)|[-–—.%:]+|N\.?C\.?)$/i;

const SECTION_RE =
  /^\s*(?:\[|\()?\s*(intro|verso|verse|coro|chorus|estribillo|pre-?coro|pre-?chorus|puente|bridge|solo|instrumental|interludio|interlude|outro|final|ending|refr[aá]n)\s*\d*\s*(?:\]|\))?\s*:?\s*$/i;

interface RawToken {
  raw: string;
  charIndex: number;
}

function tokenize(line: string): RawToken[] {
  const tokens: RawToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    tokens.push({ raw: m[0], charIndex: m.index });
  }
  return tokens;
}

function cleanChordToken(raw: string): string {
  let token = raw.replace(/^\|+/, "").replace(/[,.|]+$/, "");
  // Paréntesis envolventes: "(E)" → "E". Pero "A7(4)" o "Em7(9)" quedan
  // intactos: el paréntesis es parte del símbolo del acorde.
  while (token.length > 2 && token.startsWith("(") && token.endsWith(")")) {
    token = token.slice(1, -1);
  }
  if (token.startsWith("(") && !token.includes(")")) token = token.slice(1);
  if (token.endsWith(")") && !token.includes("(")) token = token.slice(0, -1);
  return token;
}

/** ¿El token tiene pinta de acorde (aunque esté mal escrito)? */
const CHORDISH_RE = /^[A-H][#b♯♭]?[A-Za-z0-9#b♯♭+°ºøΔ()/-]*$/;

/** Una línea es "de acordes" si (casi) todos sus tokens no-separadores son acordes. */
function classifyChordLine(tokens: RawToken[]): { isChordLine: boolean; parsed: ChordToken[] } {
  const relevant = tokens.filter((t) => !SEPARATOR_RE.test(t.raw));
  if (relevant.length === 0) return { isChordLine: false, parsed: [] };

  const parsed: ChordToken[] = [];
  let chordCount = 0;
  let allChordish = true;
  for (const t of relevant) {
    const cleaned = cleanChordToken(t.raw);
    const chordish = cleaned ? CHORDISH_RE.test(cleaned) : false;
    if (!chordish) allChordish = false;
    const result = cleaned ? parseChord(cleaned) : null;
    if (result?.ok) {
      chordCount++;
      parsed.push({ raw: t.raw, charIndex: t.charIndex, chord: result.chord });
    } else {
      parsed.push({
        raw: t.raw,
        charIndex: t.charIndex,
        chord: null,
        // Solo reportamos como error lo que parece un acorde mal escrito
        error: chordish && result && !result.ok ? result.error.message : undefined,
      });
    }
  }
  const ratio = chordCount / relevant.length;
  const isChordLine = chordCount >= 1 && (allChordish ? ratio >= 0.5 : ratio >= 0.75);
  return { isChordLine, parsed };
}

/** Convierte "El [E]sol ca[F#m]lienta" en línea de acordes + línea de letra. */
function splitBracketedLine(line: string): { chordLine: string; lyricLine: string } | null {
  const re = /\[([^\]\s]+)\]/g;
  let hasChord = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (parseChord(m[1]).ok) hasChord = true;
  }
  if (!hasChord) return null;

  let chordLine = "";
  let lyricLine = "";
  let cursor = 0;
  re.lastIndex = 0;
  while ((m = re.exec(line)) !== null) {
    lyricLine += line.slice(cursor, m.index);
    const col = lyricLine.length;
    if (chordLine.length < col) chordLine += " ".repeat(col - chordLine.length);
    else if (chordLine.length > 0) chordLine += " ";
    chordLine += m[1];
    cursor = m.index + m[0].length;
  }
  lyricLine += line.slice(cursor);
  return { chordLine, lyricLine };
}

export function parseSong(input: string): ParsedSong {
  const rawLines = input.replace(/\r\n?/g, "\n").split("\n");

  // Pre-proceso: expandir líneas con acordes entre corchetes
  const expanded: string[] = [];
  for (const line of rawLines) {
    if (/\[[^\]]+\]/.test(line) && !SECTION_RE.test(line)) {
      const split = splitBracketedLine(line);
      if (split) {
        expanded.push(split.chordLine, split.lyricLine);
        continue;
      }
    }
    expanded.push(line);
  }

  const lines: SongLine[] = [];
  const occurrences: ChordOccurrence[] = [];
  const uniqueMap = new Map<string, ParsedChord>();
  const errors: string[] = [];
  let title: string | null = null;
  let artist: string | null = null;
  let currentSection: string | null = null;

  // Metadatos explícitos al comienzo
  const metaRe = /^\s*(t[ií]tulo|title|artista|artist|canci[oó]n|song)\s*:\s*(.+)$/i;

  for (const raw of expanded) {
    const lineIndex = lines.length;
    const trimmed = raw.trim();

    const meta = metaRe.exec(raw);
    if (meta && lineIndex < 6) {
      const key = meta[1].toLowerCase();
      if (key.startsWith("t") || key.startsWith("c") || key.startsWith("s")) title = meta[2].trim();
      else artist = meta[2].trim();
      lines.push({ type: "blank", text: "" });
      continue;
    }

    if (!trimmed) {
      lines.push({ type: "blank", text: "" });
      continue;
    }

    if (SECTION_RE.test(trimmed) || (/^\[[^\]]+\]$/.test(trimmed) && !parseChord(trimmed.slice(1, -1)).ok)) {
      const name = trimmed.replace(/[[\]():]/g, "").trim();
      currentSection = name;
      lines.push({ type: "section", text: raw, name });
      continue;
    }

    const tokens = tokenize(raw);
    const { isChordLine, parsed } = classifyChordLine(tokens);
    if (isChordLine) {
      for (const token of parsed) {
        if (token.chord) {
          token.occurrenceIndex = occurrences.length;
          occurrences.push({
            index: occurrences.length,
            chord: token.chord,
            lineIndex,
            charIndex: token.charIndex,
            sectionName: currentSection,
          });
          if (!uniqueMap.has(token.chord.normalized)) {
            uniqueMap.set(token.chord.normalized, token.chord);
          }
        } else if (token.error) {
          errors.push(token.error);
        }
      }
      lines.push({ type: "chords", text: raw, tokens: parsed });
    } else {
      lines.push({ type: "lyric", text: raw });
    }
  }

  return {
    title,
    artist,
    lines,
    occurrences,
    uniqueChords: [...uniqueMap.values()],
    errors: [...new Set(errors)],
  };
}
