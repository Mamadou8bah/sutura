/**
 * Sutura mobile tokens. Shared, identical copies live in sutura-app, sutura-agent
 * and merchant-app (there is no shared JS package). Keep the three in step.
 *
 * Orange (`orange`) is a fill colour for the one primary action per screen. Text
 * that needs to read as orange (links, selected labels) uses `accentText`, which
 * passes 4.5:1 in both modes. Status colours come from the tone pairs below and
 * are always paired with a dot and a label (see StatusPill).
 */
export const colors = {
  background: "#fff9f4",
  walletSurface: "#ffdfc5",
  walletHighlight: "#fff5ec",
  actionFill: "#b8390c",
  actionInk: "#ffffff",
  walletInk: "#482a18",
  walletMuted: "#765642",
  surface: "#ffffff",
  surfaceMuted: "#f7eee7",
  border: "#e9d9ce",
  primary: "#1c1c1e",
  primaryDark: "#111315",
  primaryMid: "#343a40",
  primaryLight: "#525960",
  orange: "#f97316",
  /** Text-safe orange: 5.18:1 on white. */
  orangeDark: "#c2410c",
  accentText: "#c2410c",
  /** Label colour on an orange fill: 6.2:1. */
  onAccent: "#181a20",
  orangeLight: "#ffedd5",
  white: "#ffffff",
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  /** Secondary text: 5.4:1 on surfaceMuted. */
  slate500: "#5b6577",
  /** Icons and hairline glyphs only, never body text. */
  slate400: "#7c8595",
  slate300: "#cbd5e1",
  emerald700: "#047857",
  emerald100: "#d1fae5",
  rose500: "#be123c",
  rose100: "#ffe4e6",
  rose800: "#9f1239",
  blue100: "#f5f5f7",
  chatAgent: "#e2e8f0",
  chatUser: "#1c1c1e",
  successFg: "#047857",
  successBg: "#d1fae5",
  warningFg: "#7a4f00",
  warningBg: "#fdf0d2",
  dangerFg: "#9f1239",
  dangerBg: "#ffe4e6",
  infoFg: "#3e4d66",
  infoBg: "#eef1f6",
  mutedFg: "#5b6577",
  mutedBg: "#f0f2f6",
  neutralFg: "#334155",
  neutralBg: "#f5f5f7",
  skeleton: "#ececf0",
};

export type ThemeColors = { [Key in keyof typeof colors]: string };
export const darkColors: ThemeColors = {
  ...colors, walletSurface: "#4c2b1b", walletHighlight: "#30211a", actionFill: "#fb923c", actionInk: "#221409", walletInk: "#ffe7d3", walletMuted: "#dabfa9", background: "#181310", surface: "#241c18", surfaceMuted: "#302620",
  border: "#48372d", primary: "#f2f2f7", primaryDark: "#ffffff", primaryMid: "#d8dce1",
  primaryLight: "#b7bdc6", orangeDark: "#fb923c", accentText: "#fb923c", orangeLight: "#3c2c20",
  slate900: "#f2f2f7", slate800: "#d8dce1",
  slate700: "#c5cbd3", slate500: "#a1a9b5", slate400: "#8d97a5", slate300: "#47515e",
  emerald700: "#6fd3a5", emerald100: "#11301f", rose500: "#ff8c99", rose100: "#3d141c",
  rose800: "#ff8c99", blue100: "#2c2c2e", chatAgent: "#2c2c2e", chatUser: "#343a40",
  successFg: "#6fd3a5", successBg: "#11301f", warningFg: "#f6c86a", warningBg: "#3a2a08",
  dangerFg: "#ff8c99", dangerBg: "#3d141c", infoFg: "#c5cfdd", infoBg: "#222d41",
  mutedFg: "#9aa3b5", mutedBg: "#1d2738", neutralFg: "#c5cbd3", neutralBg: "#2c2c2e",
  skeleton: "#2c2c2e",
};

/** Control 12, card 16, sheet 24. Nested radius = outer − padding. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

/** 4-pt grid: 16-pt gutters, 12/24 section gaps. */
export const spacing = {
  screen: 16,
  gap: 12,
  section: 24,
};

/** Type scale 28 / 22 / 17 / 15 / 13 (12 only for tab labels). */
export const type = {
  title: 28,
  section: 20,
  headline: 17,
  body: 15,
  caption: 13,
  tab: 12,
  display: 32,
} as const;

/** Bundled Inter at 400 / 500 / 600 / 700, shared across platforms. */
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  black: "Inter_700Bold",
} as const;

/** Tabular figures for every amount, so columns of money line up. */
export const tabular = { fontVariant: ["tabular-nums" as const] };

export const shadow = {
  card: {
    shadowColor: "#1c1c1e",
    shadowOpacity: 0.035,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
};
