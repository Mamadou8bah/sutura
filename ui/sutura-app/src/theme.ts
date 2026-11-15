export const colors = {
  background: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f5f5f7",
  border: "#e5e5ea",
  primary: "#1c1c1e",
  primaryDark: "#111315",
  primaryMid: "#343a40",
  primaryLight: "#525960",
  orange: "#f97316",
  orangeDark: "#ea580c",
  orangeLight: "#ffedd5",
  white: "#ffffff",
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  emerald700: "#047857",
  emerald100: "#d1fae5",
  rose500: "#f43f5e",
  rose100: "#ffe4e6",
  rose800: "#9f1239",
  blue100: "#ffedd5",
  chatAgent: "#e2e8f0",
  chatUser: "#1c1c1e",
};

export type ThemeColors = { [Key in keyof typeof colors]: string };
export const darkColors: ThemeColors = {
  ...colors, background: "#000000", surface: "#1c1c1e", surfaceMuted: "#2c2c2e",
  border: "#38383a", primary: "#f2f2f7", primaryDark: "#ffffff", primaryMid: "#d8dce1",
  primaryLight: "#b7bdc6", orangeLight: "#3c2c20", slate900: "#f2f2f7", slate800: "#d8dce1",
  slate700: "#c5cbd3", slate500: "#a1a9b5", slate400: "#8d97a5", slate300: "#47515e",
  emerald700: "#54d6a4", emerald100: "#15382c", rose500: "#ff8193", rose100: "#442731",
  rose800: "#ff9eac", blue100: "#3c2c20", chatAgent: "#2c2c2e", chatUser: "#343a40",
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const spacing = {
  screen: 20,
  gap: 12,
};

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  bold: "Inter_700Bold",
  black: "Inter_700Bold",
} as const;

export const shadow = {
  card: {
    shadowColor: "#1c1c1e",
    shadowOpacity: 0.035,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  fab: {
    shadowColor: "#f97316",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
};
