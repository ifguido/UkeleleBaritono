import { useState } from "react";
import { ChordExplorer } from "@/features/chords/ChordExplorer";
import { ChordFinder } from "@/features/chords/ChordFinder";
import { AppText, Screen, Segmented } from "@/ui";

type Mode = "buscar" | "identificar";

export default function ChordsScreen() {
  const [mode, setMode] = useState<Mode>("buscar");
  return (
    <Screen>
      <Segmented
        block
        value={mode}
        onChange={setMode}
        options={[
          { value: "buscar", label: "Buscar posiciones" },
          { value: "identificar", label: "¿Qué acorde es?" },
        ]}
      />
      <AppText variant="muted">
        {mode === "buscar"
          ? "Todas las posiciones válidas de cualquier acorde en el diapasón, generadas y verificadas nota por nota."
          : "Marcá los trastes que estás pisando (x = cuerda silenciada) y te digo qué acorde suena."}
      </AppText>
      {mode === "buscar" ? <ChordExplorer /> : <ChordFinder />}
    </Screen>
  );
}
