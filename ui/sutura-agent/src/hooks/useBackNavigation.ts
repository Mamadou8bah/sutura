import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { BackHandler, Platform } from "react-native";

// Screen-local steps take precedence regardless of parent/child effect order.
const localHandlers = new Set<() => boolean>();
function handleLocalBack() {
  return [...localHandlers].reverse().some(handler => handler());
}
export function nextHistory<T>(history: T[], next: T): T[] {
  const index = history.lastIndexOf(next);
  return index >= 0 ? history.slice(0, index + 1) : [...history, next].slice(-50);
}
export function useHardwareBack(handler: () => boolean) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const callback = () => latest.current();
    localHandlers.add(callback);
    const subscription = BackHandler.addEventListener("hardwareBackPress", handleLocalBack);
    return () => { localHandlers.delete(callback); subscription.remove(); };
  }, []);
}
export function useBackNavigation<T>(initial: T, root: T = initial) {
  const [screen, updateScreen] = useState<T>(initial);
  const history = useRef<T[]>([initial]);
  const rootRef = useRef(root);
  rootRef.current = root;
  const setScreen: Dispatch<SetStateAction<T>> = useCallback(value => {
    const current = history.current[history.current.length - 1];
    const next = typeof value === "function" ? (value as (previous: T) => T)(current) : value;
    history.current = nextHistory(history.current, next);
    updateScreen(next);
  }, []);
  const resetHistory = useCallback(() => {
    history.current = [history.current[history.current.length - 1]];
  }, []);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (handleLocalBack()) return true;
      if (history.current.length > 1) {
        history.current = history.current.slice(0, -1);
        updateScreen(history.current[history.current.length - 1]);
        return true;
      }
      if (history.current[0] !== rootRef.current) {
        history.current = [rootRef.current];
        updateScreen(rootRef.current);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, []);
  return [screen, setScreen, resetHistory] as const;
}
