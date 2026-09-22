import { useColorScheme } from "react-native";
import { Theme, dark, light } from "./tokens";

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}
