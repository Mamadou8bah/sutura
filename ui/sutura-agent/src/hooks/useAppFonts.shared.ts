import { useEffect, useRef, useState } from "react";
import { useFonts } from "expo-font";
import { applyFontDefaults } from "../setupFonts";

// Four bundled files, no font-network dependency and no import of the full font pack.
export function useAppFonts() {
  const [loaded, error] = useFonts({
    Poppins_400Regular: require("@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf"),
    Poppins_500Medium: require("@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf"),
    Poppins_600SemiBold: require("@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf"),
    Poppins_700Bold: require("@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf"),
  });
  const applied = useRef(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setTimedOut(true), 8000); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (loaded && !applied.current) { applyFontDefaults(); applied.current = true; } }, [loaded]);
  return loaded || !!error || timedOut;
}
