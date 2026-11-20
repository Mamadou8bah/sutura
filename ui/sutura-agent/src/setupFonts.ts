import { Text, TextInput, type TextInputProps, type TextProps } from "react-native";
import { platformTextStyle } from "./components/NativeControls";

export function applyFontDefaults() {
  const baseStyle = platformTextStyle(undefined);

  const TextComponent = Text as typeof Text & { defaultProps?: Partial<TextProps> };
  TextComponent.defaultProps = {
    ...TextComponent.defaultProps,
    style: baseStyle,
  };

  const InputComponent = TextInput as typeof TextInput & { defaultProps?: Partial<TextInputProps> };
  InputComponent.defaultProps = {
    ...InputComponent.defaultProps,
    style: baseStyle,
  };
}
