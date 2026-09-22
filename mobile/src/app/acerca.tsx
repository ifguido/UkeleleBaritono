import { Linking, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { PRIVACY_URL, WEB_ORIGIN } from "@/lib/config";
import { space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Button, Card, Screen, Section } from "@/ui";

export default function AboutScreen() {
  const t = useTheme();
  const version = Constants.expoConfig?.version ?? "1.0.0";
  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <AppText variant="title">Ukelele Barítono</AppText>
        <AppText variant="muted">
          Acordes, escalas, afinador y adaptador de canciones para ukelele barítono en afinación D–G–B–E.
        </AppText>
        <AppText variant="caption">Versión {version}</AppText>
      </View>

      <Section title="Cómo funciona">
        <Card>
          <AppText>
            Todo lo musical se calcula desde los intervalos y se verifica nota por nota: no hay tablas de
            posiciones copiadas en ningún lado. Si un diagrama aparece, es porque el motor comprobó que
            contiene las notas que el acorde tiene que contener.
          </AppText>
          <AppText style={{ marginTop: 8 }}>
            Funciona sin conexión. Lo único que necesita internet es importar una canción desde una URL, y
            en ese caso solo se envía la dirección de la página.
          </AppText>
        </Card>
      </Section>

      <Section title="Privacidad">
        <Card>
          <AppText>
            El afinador usa el micrófono para analizar la altura de la cuerda en el teléfono. El audio no se
            graba ni se envía a ningún servidor. Las canciones guardadas quedan solo en este dispositivo.
          </AppText>
          <View style={styles.links}>
            <Button title="Política de privacidad" icon="shield-checkmark-outline" variant="secondary" size="sm" onPress={() => void Linking.openURL(PRIVACY_URL)} />
          </View>
        </Card>
      </Section>

      <Section title="Créditos">
        <Card>
          <AppText variant="muted">
            Muestras de cuerda de nylon: soundfont FluidR3 (licencia MIT). Motor de audio: react-native-audio-api
            (Software Mansion, MIT). Detección de altura: algoritmo YIN (de Cheveigné y Kawahara, 2002).
          </AppText>
          <View style={styles.links}>
            <Button title="Versión web" icon="globe-outline" variant="subtle" size="sm" onPress={() => void Linking.openURL(WEB_ORIGIN)} />
          </View>
        </Card>
      </Section>
      <AppText variant="caption" align="center" color={t.textFaint}>
        Hecho con cariño para quienes tocan el más grave de los ukeleles.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: space.md },
});
