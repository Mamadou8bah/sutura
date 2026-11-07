export const colors = {
  background: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f5f3ef",
  border: "#e7e3dc",
  primary: "#1f2328",
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
  chatUser: "#1f2328",
};

export type ThemeColors = { [Key in keyof typeof colors]: string };
export const darkColors: ThemeColors = {
  ...colors, background: "#181a20", surface: "#1e2329", surfaceMuted: "#2b3139",
  border: "#353c45", primary: "#eaecef", primaryDark: "#ffffff", primaryMid: "#d8dce1",
  primaryLight: "#b7bdc6", orangeLight: "#3c2c20", slate900: "#eaecef", slate800: "#d8dce1",
  slate700: "#c5cbd3", slate500: "#a1a9b5", slate400: "#8d97a5", slate300: "#47515e",
  emerald700: "#54d6a4", emerald100: "#15382c", rose500: "#ff8193", rose100: "#442731",
  rose800: "#ff9eac", blue100: "#3c2c20", chatAgent: "#2b3139", chatUser: "#343a40",
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const spacing = {
  screen: 16,
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
    shadowColor: "#1f2328",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  fab: {
    shadowColor: "#f97316",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
};
