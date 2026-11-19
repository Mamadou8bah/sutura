import type { Config } from "tailwindcss";

/**
 * Sutura web tokens. Every colour below resolves to a CSS variable defined in
 * app/theme-tokens.css, so the same class works in light and dark themes
 * (`data-theme` on <html>, or the OS preference when it is "auto").
 *
 * - Sutura orange (#f97316) is the single accent. `orange-700` is the
 *   accent-as-text colour (#c2410c light, #fb923c dark).
 * - `slate` and `white` are remapped to Sutura's neutral white/charcoal ramp.
 * - Status hues (emerald, rose, amber, blue, red) flip for dark mode, but new
 *   status UI should use <StatusBadge> and the `status-*` tokens.
 */
const steps = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
const themed = (name: string) =>
  Object.fromEntries(steps.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        white: v("white"),
        slate: themed("slate"),
        orange: themed("orange"),
        emerald: themed("emerald"),
        rose: themed("rose"),
        amber: themed("amber"),
        blue: themed("blue"),
        red: themed("red"),
        green: themed("green"),
        violet: themed("violet"),
        canvas: v("canvas"),
        surface: { DEFAULT: v("surface"), 2: v("surface-2"), 3: v("surface-3") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        ink: { DEFAULT: v("ink"), 2: v("ink-2"), 3: v("ink-3") },
        "charcoal-card": v("charcoal-card"),
        accent: {
          DEFAULT: v("accent"),
          hover: v("accent-hover"),
          on: v("on-accent"),
          ink: v("accent-ink"),
          tint: v("accent-tint"),
        },
        status: {
          "pending-fg": v("pending-fg"),
          "pending-bg": v("pending-bg"),
          "review-fg": v("review-fg"),
          "review-bg": v("review-bg"),
          "posted-fg": v("posted-fg"),
          "posted-bg": v("posted-bg"),
          "reversed-fg": v("reversed-fg"),
          "reversed-bg": v("reversed-bg"),
          "failed-fg": v("failed-fg"),
          "failed-bg": v("failed-bg"),
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        heading: ["var(--font-manrope)", "ui-sans-serif", "system-ui"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      // The audit bans 800/900 weights; legacy font-black/extrabold render at 700.
      fontWeight: {
        extrabold: "700",
        black: "700",
      },
      borderRadius: {
        control: "8px",
        row: "10px",
        card: "14px",
        panel: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.05)",
        pop: "0 8px 24px rgb(0 0 0 / 0.08)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
