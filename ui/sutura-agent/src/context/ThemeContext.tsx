import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors as lightColors, darkColors, type ThemeColors } from "../theme";
export type ThemePreference = "light" | "dark" | "system";
const KEY = "sutura-agent_theme_preference";
const ThemeContext = createContext({ colors: lightColors as ThemeColors, mode: "light" as "light" | "dark", preference: "light" as ThemePreference, setPreference: (_: ThemePreference) => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, updatePreference] = useState<ThemePreference>("light");
  const [ready, setReady] = useState(false);
  useEffect(() => { let active = true; AsyncStorage.getItem(KEY).then(value => { if (active && ["light", "dark", "system"].includes(value ?? "")) updatePreference(value as ThemePreference); }).catch(() => {}).finally(() => {if(active) setReady(true);}); return () => { active = false; }; }, []);
  const mode = preference === "system" ? system === "dark" ? "dark" : "light" : preference;
  const colors = mode === "dark" ? darkColors : lightColors;
  useEffect(() => { if (Platform.OS === "web" && typeof document !== "undefined") { document.body.style.backgroundColor = colors.background; document.documentElement.style.colorScheme = mode; } }, [colors, mode]);
  const value = useMemo(() => ({colors, mode, preference, setPreference: (next: ThemePreference) => { updatePreference(next); void AsyncStorage.setItem(KEY, next).catch(() => {}); }}), [colors, mode, preference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
