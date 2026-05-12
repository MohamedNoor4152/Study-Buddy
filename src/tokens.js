// Study Buddy — design tokens
// Theme: SDSU-inspired. Warm off-white bone, charcoal ink, deep crimson accent.

export const THEMES = {
  campus: {
    name: 'Campus',
    bg: 'oklch(0.97 0.008 70)',
    surface: 'oklch(1 0 0)',
    surface2: 'oklch(0.955 0.01 75)',
    border: 'oklch(0.89 0.012 75)',
    ink: 'oklch(0.22 0.01 60)',
    ink2: 'oklch(0.45 0.012 65)',
    ink3: 'oklch(0.62 0.012 70)',
    accent: 'oklch(0.48 0.17 25)',
    accentInk: 'oklch(0.99 0 0)',
    accentSoft: 'oklch(0.94 0.04 25)',
    positive: 'oklch(0.55 0.12 150)',
    warning: 'oklch(0.72 0.13 75)',
  },
  neutral: {
    name: 'Neutral',
    bg: 'oklch(0.98 0.003 80)',
    surface: 'oklch(1 0 0)',
    surface2: 'oklch(0.965 0.004 80)',
    border: 'oklch(0.9 0.005 80)',
    ink: 'oklch(0.2 0.005 70)',
    ink2: 'oklch(0.45 0.006 70)',
    ink3: 'oklch(0.62 0.006 75)',
    accent: 'oklch(0.35 0.02 60)',
    accentInk: 'oklch(0.99 0 0)',
    accentSoft: 'oklch(0.93 0.01 70)',
    positive: 'oklch(0.55 0.12 150)',
    warning: 'oklch(0.72 0.13 75)',
  },
  dark: {
    name: 'Dark',
    bg: 'oklch(0.18 0.008 60)',
    surface: 'oklch(0.22 0.01 60)',
    surface2: 'oklch(0.26 0.012 60)',
    border: 'oklch(0.32 0.014 60)',
    ink: 'oklch(0.96 0.008 70)',
    ink2: 'oklch(0.75 0.01 70)',
    ink3: 'oklch(0.58 0.012 70)',
    accent: 'oklch(0.62 0.18 25)',
    accentInk: 'oklch(0.99 0 0)',
    accentSoft: 'oklch(0.32 0.05 25)',
    positive: 'oklch(0.7 0.14 150)',
    warning: 'oklch(0.78 0.14 75)',
  },
};

export const FONTS = {
  serif: '"Instrument Serif", "Iowan Old Style", Georgia, serif',
  sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
};
