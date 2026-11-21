import { useEffect, useState } from "react";
import { Platform } from "react-native";

/** Mobile browsers can shrink only the visual viewport when the keyboard opens. */
export function useWebKeyboardFrame() {
  const [frame, setFrame] = useState<{ maxHeight: number; marginTop: number }>();
  useEffect(() => {
    if (Platform.OS !== "web" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const update = () => {
      const active = document.activeElement;
      const editing = (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement)
        && !active.readOnly && !active.disabled;
      const reduced = viewport.scale === 1 && window.innerHeight - viewport.height > 100;
      const height = viewport.height;
      const top = viewport.offsetTop;
      // A button can take focus before its click fires. Wait for the viewport
      // to recover so the button stays in place while the keyboard closes.
      setFrame(previous => {
        if (!reduced || (!editing && !previous)) return undefined;
        if (previous?.maxHeight === height && previous.marginTop === top) return previous;
        return { maxHeight: height, marginTop: top };
      });
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
    };
  }, []);
  return frame;
}
