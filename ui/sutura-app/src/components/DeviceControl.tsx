import { requireNativeView as requireNativeViewManager, requireOptionalNativeModule } from "expo";
import { Platform, type NativeSyntheticEvent, type ViewProps } from "react-native";

export type DeviceControlProps = ViewProps & {
  controlKind: "button" | "select" | "switch" | "tabs";
  label: string;
  disabled?: boolean;
  dark: boolean;
  value?: string;
  checked?: boolean;
  options?: readonly { value: string; label: string; enabled?: boolean; icon?: string; badge?: number }[];
  onAction?: () => void;
  onValueChange?: (event: NativeSyntheticEvent<{ value?: string; checked?: boolean }>) => void;
};

// Old APKs and Expo Go retain the existing fallback until rebuilt. Never require
// a native view manager on web or on a runtime that does not contain the module.
const nativeModule = Platform.OS !== "web" ? requireOptionalNativeModule<{ supportsNativeTabs?: boolean }>("SuturaDeviceUI") : null;
export const DeviceControl = nativeModule
  ? requireNativeViewManager<DeviceControlProps>("SuturaDeviceUI") : null;

export const supportsNativeTabs = nativeModule?.supportsNativeTabs === true;
