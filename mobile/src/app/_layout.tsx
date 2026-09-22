import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from "expo-router";
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { preloadAudio } from "@/audio/synth";
import { useTheme } from "@/theme/useTheme";

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

/**
 * Compartir desde otra app (Safari, Chrome, un sitio de acordes) abre esta
 * app con el contenido: acá solo se lleva a la pestaña Canción, que es la
 * que sabe qué hacer con una URL o con un texto.
 */
function ShareIntentRedirect() {
  const router = useRouter();
  const { hasShareIntent } = useShareIntentContext();
  useEffect(() => {
    if (hasShareIntent) router.navigate("/cancion");
  }, [hasShareIntent, router]);
  return null;
}

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <ShareIntentRedirect />
      <AppShell />
    </ShareIntentProvider>
  );
}

function AppShell() {
  const t = useTheme();
  const navTheme = {
    ...(t.scheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(t.scheme === "dark" ? DarkTheme : DefaultTheme).colors,
      primary: t.accent,
      background: t.bg,
      card: t.bg,
      text: t.text,
      border: t.border,
    },
  };

  useEffect(() => {
    // Los samples se decodifican mientras se ve el splash: el primer acorde
    // que se toca ya suena a nylon de verdad.
    preloadAudio();
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="acerca"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Acerca de",
              headerStyle: { backgroundColor: t.bg },
              headerTintColor: t.accent,
              headerTitleStyle: { color: t.text },
            }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
