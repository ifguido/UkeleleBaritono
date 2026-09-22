import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { OptimizeMode } from "@core/engine/optimizer";
import { VoicingOptions } from "@core/engine/voicings";
import { space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Button, Card, Chip, ChipRow, Stepper } from "@/ui";
import { Settings } from "./useSongWorkspace";

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
}

const MODES: { value: OptimizeMode; label: string; hint: string }[] = [
  { value: "auto", label: "Automático", hint: "equilibrio entre comodidad y sonido" },
  { value: "easy", label: "Fácil", hint: "posiciones abiertas y trastes bajos" },
  { value: "balanced", label: "Equilibrado", hint: "comodidad, buen bajo y conducción de voces" },
  { value: "faithful", label: "Fiel", hint: "acordes completos, bajos e inversiones originales" },
  { value: "advanced", label: "Avanzado", hint: "permite posiciones altas y cejillas" },
];

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={styles.toggle}>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.accent }} />
    </View>
  );
}

/** Modo de arreglo y opciones de generación de posiciones. */
export function AdvancedSettings({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const vo = settings.voicingOptions;
  const setVo = (patch: VoicingOptions) => onChange({ ...settings, voicingOptions: { ...vo, ...patch } });

  return (
    <Card padding={space.md}>
      <Button
        title="Opciones avanzadas"
        icon={open ? "chevron-up" : "chevron-down"}
        variant="ghost"
        size="sm"
        onPress={() => setOpen((o) => !o)}
        style={{ alignSelf: "stretch" }}
      />
      {open && (
        <View style={{ gap: space.lg, marginTop: space.sm }}>
          <View style={{ gap: 6 }}>
            <AppText variant="label">Modo de arreglo</AppText>
            <ChipRow>
              {MODES.map((m) => (
                <Chip key={m.value} label={m.label} solid active={settings.mode === m.value} onPress={() => onChange({ ...settings, mode: m.value })} />
              ))}
            </ChipRow>
            <AppText variant="caption">{MODES.find((m) => m.value === settings.mode)?.hint}</AppText>
          </View>

          <View style={styles.toggle}>
            <AppText style={{ flex: 1 }}>Traste máximo</AppText>
            <Stepper label="traste máximo" value={vo.maxFret ?? 12} min={3} max={15} onChange={(n) => setVo({ maxFret: n })} />
          </View>
          <View style={styles.toggle}>
            <AppText style={{ flex: 1 }}>Mínimo de cuerdas</AppText>
            <Stepper label="mínimo de cuerdas" value={vo.minStrings ?? 3} min={2} max={4} onChange={(n) => setVo({ minStrings: n })} />
          </View>
          <Toggle label="Fundamental siempre en el bajo" value={vo.requireRootInBass ?? false} onChange={(v) => setVo({ requireRootInBass: v })} />
          <Toggle label="Permitir inversiones" value={vo.allowInversions ?? true} onChange={(v) => setVo({ allowInversions: v })} />
          <Toggle label="Permitir cuerdas silenciadas" value={vo.allowMuted ?? true} onChange={(v) => setVo({ allowMuted: v })} />
          <Toggle label="Permitir omitir la quinta" value={vo.allowOmittedFifth ?? true} onChange={(v) => setVo({ allowOmittedFifth: v })} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: "row", alignItems: "center", gap: 12 },
});
