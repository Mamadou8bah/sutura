import { requireNativeView as requireNativeViewManager, requireOptionalNativeModule } from "expo";
import { Platform, type NativeSyntheticEvent, type ViewProps } from "react-native";

export type DeviceControlProps = ViewProps & {
  controlKind: "button" | "select" | "switch";
  label: string;
  disabled?: boolean;
  dark: boolean;
  value?: string;
  checked?: boolean;
  options?: readonly { value: string; label: string; enabled?: boolean }[];
  onAction?: () => void;
  onValueChange?: (event: NativeSyntheticEvent<{ value?: string; checked?: boolean }>) => void;
};

// Old APKs and Expo Go retain the existing fallback until rebuilt. Never require
// a native view manager on web or on a runtime that does not contain the module.
export const DeviceControl = Platform.OS !== "web" && requireOptionalNativeModule("SuturaDeviceUI")
  ? requireNativeViewManager<DeviceControlProps>("SuturaDeviceUI") : null;
