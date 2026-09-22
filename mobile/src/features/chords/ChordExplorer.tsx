import { useMemo, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { FORMULAS, parseChordFlexible } from "@core/engine/chords";
import { PC_NAMES_FLAT, PC_NAMES_SHARP } from "@core/engine/notes";
import { Voicing, VoicingOptions, generateVoicings, recommendScore } from "@core/engine/voicings";
import { selectionFeedback } from "@/lib/haptics";
import { space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Button, Card, Chip, ChipRow, Field, Notice, Stepper } from "@/ui";
import { VoicingCard } from "./VoicingCard";

type SortKey = "recommended" | "easiest" | "lowestBass" | "highest" | "complete" | "noMuted";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recomendados" },
  { value: "easiest", label: "Más fáciles" },
  { value: "lowestBass", label: "Bajo más grave" },
  { value: "highest", label: "Registro agudo" },
  { value: "complete", label: "Más completos" },
  { value: "noMuted", label: "Sin silenciadas" },
];

/** Cualidades en el orden en que se buscan: lo común primero. */
const QUALITY_ORDER = [
  "major", "minor", "7", "m7", "maj7", "sus4", "sus2", "dim", "aug", "6", "m6", "m7b5", "dim7", "add9", "madd9",
  "9", "maj9", "m9", "mMaj7", "69", "11", "m11", "13", "7sus4", "9sus4", "7b9", "7#9", "7b5", "7#5", "maj7#11",
  "7#11", "13b9", "add4", "add11", "5",
];

function sortVoicings(list: Voicing[], key: SortKey): Voicing[] {
  const copy = [...list];
  switch (key) {
    case "easiest":
      return copy.sort((a, b) => a.difficulty - b.difficulty);
    case "lowestBass":
      return copy.sort((a, b) => a.bassMidi - b.bassMidi);
    case "highest":
      return copy.sort((a, b) => b.topMidi - a.topMidi);
    case "complete":
      return copy.sort((a, b) => a.omitted.length - b.omitted.length || a.difficulty - b.difficulty);
    case "noMuted":
      return copy.sort((a, b) => a.mutedCount - b.mutedCount || a.difficulty - b.difficulty);
    default:
      return copy.sort((a, b) => recommendScore(a) - recommendScore(b));
  }
}

const PAGE = 12;

/**
 * Explorador: escribí un cifrado o armalo con las fichas (fundamental +
 * cualidad) y mirá todas sus posiciones ordenadas como prefieras.
 */
export function ChordExplorer() {
  const t = useTheme();
  const [query, setQuery] = useState("C");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [options, setOptions] = useState<VoicingOptions>({});
  const [showAll, setShowAll] = useState(false);
  const [useFlats, setUseFlats] = useState(false);

  const parsed = useMemo(() => parseChordFlexible(query), [query]);
  const voicings = useMemo(() => (parsed.ok ? generateVoicings(parsed.chord, options) : []), [parsed, options]);
  const sorted = useMemo(() => sortVoicings(voicings, sort), [voicings, sort]);
  const visible = showAll ? sorted : sorted.slice(0, PAGE);

  const setOpt = (patch: VoicingOptions) => setOptions((o) => ({ ...o, ...patch }));

  const rootNames = useFlats ? PC_NAMES_FLAT : PC_NAMES_SHARP;
  const currentRoot = parsed.ok ? parsed.chord.root : null;
  const currentQuality = parsed.ok ? parsed.chord.quality : null;

  const compose = (root: string, quality: string) => {
    selectionFeedback();
    setShowAll(false);
    setQuery(root + FORMULAS[quality].suffix);
  };

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.sm }}>
        <Field
          mono
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setShowAll(false);
          }}
          placeholder="C#m7, G/B, Mim9…"
          style={{ fontSize: 20 }}
          returnKeyType="done"
        />
        <View style={styles.rowBetween}>
          <AppText variant="label">Fundamental</AppText>
          <Chip label={useFlats ? "♭ bemoles" : "♯ sostenidos"} size="sm" onPress={() => setUseFlats((v) => !v)} />
        </View>
        <ChipRow>
          {rootNames.map((name, pc) => (
            <Chip
              key={name}
              label={name}
              mono
              size="sm"
              minWidth={40}
              solid
              active={currentRoot === pc}
              onPress={() => compose(name, currentQuality ?? "major")}
            />
          ))}
        </ChipRow>
        <AppText variant="label">Tipo</AppText>
        <ChipRow scroll>
          {QUALITY_ORDER.filter((q) => FORMULAS[q]).map((q) => (
            <Chip
              key={q}
              label={FORMULAS[q].suffix || "mayor"}
              mono
              size="sm"
              active={currentQuality === q}
              onPress={() => compose(currentRoot !== null ? rootNames[currentRoot] : "C", q)}
            />
          ))}
        </ChipRow>
      </View>

      {parsed.ok ? (
        <View style={{ gap: 2 }}>
          <AppText variant="heading">
            {parsed.chord.normalized}{" "}
            <AppText variant="muted">— {parsed.chord.formula.description}</AppText>
          </AppText>
          <AppText variant="muted">
            {voicings.length} {voicings.length === 1 ? "posición" : "posiciones"} verificadas nota por nota
          </AppText>
        </View>
      ) : (
        query.trim() !== "" && <Notice kind="danger" message={parsed.error.message} />
      )}

      <ChipRow scroll>
        {SORTS.map((s) => (
          <Chip key={s.value} label={s.label} size="sm" active={sort === s.value} onPress={() => setSort(s.value)} />
        ))}
        <Chip label={showFilters ? "Filtros ▲" : "Filtros ▼"} size="sm" onPress={() => setShowFilters((v) => !v)} />
      </ChipRow>

      {showFilters && (
        <Card padding={space.md} style={{ gap: space.md }}>
          <View style={styles.rowBetween}>
            <AppText>Traste máximo</AppText>
            <Stepper label="traste máximo" value={options.maxFret ?? 12} min={3} max={15} onChange={(n) => setOpt({ maxFret: n })} />
          </View>
          <View style={styles.rowBetween}>
            <AppText>Mínimo de cuerdas</AppText>
            <Stepper label="mínimo de cuerdas" value={options.minStrings ?? 3} min={2} max={4} onChange={(n) => setOpt({ minStrings: n })} />
          </View>
          {(
            [
              ["Fundamental en el bajo", "requireRootInBass", false],
              ["Permitir inversiones", "allowInversions", true],
              ["Cuerdas silenciadas", "allowMuted", true],
              ["Permitir omitir la quinta", "allowOmittedFifth", true],
            ] as const
          ).map(([label, key, def]) => (
            <View key={key} style={styles.rowBetween}>
              <AppText>{label}</AppText>
              <Switch value={options[key] ?? def} onValueChange={(v) => setOpt({ [key]: v })} trackColor={{ true: t.accent }} />
            </View>
          ))}
        </Card>
      )}

      {parsed.ok && voicings.length === 0 && (
        <Notice kind="warn" message="No encontré posiciones tocables con estos filtros. Probá subir el traste máximo o permitir cuerdas silenciadas." />
      )}

      <View style={styles.grid}>
        {visible.map((v) => (
          <View key={v.display} style={styles.cell}>
            <VoicingCard symbol={parsed.ok ? parsed.chord.normalized : ""} voicing={v} compact />
          </View>
        ))}
      </View>

      {!showAll && sorted.length > PAGE && (
        <Button title={`Ver las ${sorted.length - PAGE} posiciones restantes`} variant="subtle" block onPress={() => setShowAll(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: { width: "48%", flexGrow: 1 },
});
