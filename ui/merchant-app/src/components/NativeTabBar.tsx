import { Platform, useWindowDimensions } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { DeviceControl, supportsNativeTabs } from "./DeviceControl";

export { supportsNativeTabs };
export type NativeTab = { value: string; label: string; icon: string; enabled?: boolean; badge?: number };
export function NativeTabBar({ active, tabs, onChange }: {
  active: string; tabs: readonly NativeTab[]; onChange: (value: string) => void;
}) {
  const { mode } = useTheme();
  const { fontScale } = useWindowDimensions();
  if (!supportsNativeTabs || !DeviceControl) return null;
  return <DeviceControl controlKind="tabs" label="Main navigation" dark={mode === "dark"}
    value={active} options={tabs} style={{ width: "100%", height: Platform.OS === "ios" ? 49 : Math.max(80, 48 + 20 * fontScale) }}
    onValueChange={event => {
      const next = event.nativeEvent.value;
      if (next !== active && tabs.some(tab => tab.value === next && tab.enabled !== false)) onChange(next!);
    }} />;
}
