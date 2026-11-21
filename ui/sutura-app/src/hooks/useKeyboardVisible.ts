import { useWebKeyboardFrame } from "./useWebKeyboardFrame";
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Keep navigation out of the reduced form viewport while typing. */
export function useKeyboardVisible() {
  const webFrame = useWebKeyboardFrame();
  const [visible, setVisible] = useState(() => Platform.OS !== "web" && Keyboard.isVisible());
  useEffect(() => {
    if (Platform.OS === "web") return;
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible || !!webFrame;
}
