import type { NativeStackNavigationOptions } from "expo-router/native-stack";
import { Theme } from "@/theme/tokens";

/**
 * Opciones comunes de las pilas de cada pestaña: título grande nativo.
 *
 * Los colores del título salen del tema de navegación (ver el layout raíz),
 * no de acá: en iOS 26, pasar `headerTitleStyle`/`headerLargeTitleStyle`
 * hace que el título grande directamente no se dibuje.
 */
export function stackOptions(t: Theme): NativeStackNavigationOptions {
  return {
    headerLargeTitle: true,
    headerShadowVisible: false,
    headerTintColor: t.accent,
    contentStyle: { backgroundColor: t.bg },
  };
}
