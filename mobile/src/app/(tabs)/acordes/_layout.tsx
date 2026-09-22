import { Stack } from "expo-router";
import { stackOptions } from "@/features/stackOptions";
import { useTheme } from "@/theme/useTheme";

export default function Layout() {
  const t = useTheme();
  return (
    <Stack screenOptions={stackOptions(t)}>
      <Stack.Screen name="index" options={{ title: "Acordes" }} />
    </Stack>
  );
}
