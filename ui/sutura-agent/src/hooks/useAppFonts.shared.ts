import { useEffect, useRef, useState } from "react";
import { useFonts } from "expo-font";
import { applyFontDefaults } from "../setupFonts";

// Four bundled files, no font-network dependency and no import of the full font pack.
export function useAppFonts() {
  const [loaded, error] = useFonts({
    Inter_400Regular: require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
    Inter_500Medium: require("@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf"),
    Inter_600SemiBold: require("@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
    Inter_700Bold: require("@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf"),
  });
  const applied = useRef(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setTimedOut(true), 8000); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (loaded && !applied.current) { applyFontDefaults(); applied.current = true; } }, [loaded]);
  return loaded || !!error || timedOut;
}
