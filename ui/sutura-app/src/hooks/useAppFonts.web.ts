import { useEffect, useRef, useState } from "react";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { applyFontDefaults } from "../setupFonts";
export function useAppFonts() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const applied = useRef(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setTimedOut(true), 8000); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (loaded && !applied.current) { applyFontDefaults(); applied.current = true; } }, [loaded]);
  return loaded || !!error || timedOut;
}
