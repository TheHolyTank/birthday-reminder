// Group colors are arbitrary hex values (not Tailwind classes), so they're
// rendered with inline styles computed here rather than static class names.
// This also sidesteps Tailwind's build-time class scanning entirely, which
// only ever supports a fixed, known-ahead-of-time set of classes.

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// lighten a hex color toward white by `amount` (0-1), used so accent text
// stays readable on a near-black background in dark mode
function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  const toHex = (x) => x.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

// 32 evenly-spaced hues around the color wheel, at a consistent saturation
// and lightness — a genuine "pick any color" grid rather than a handful of
// presets.
const SWATCH_COUNT = 32;
export const GROUP_COLOR_SWATCHES = Array.from({ length: SWATCH_COUNT }, (_, i) =>
  hslToHex((i * 360) / SWATCH_COUNT, 72, 54)
);

export const DEFAULT_GROUP_COLOR = "#ec4899";

// older deployments stored one of these fixed names instead of a hex value
const LEGACY_NAME_TO_HEX = {
  pink: "#ec4899",
  indigo: "#6366f1",
  teal: "#14b8a6",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  emerald: "#10b981",
  sky: "#0ea5e9",
  rose: "#f43f5e",
};

export function normalizeColor(color) {
  if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) return color;
  return LEGACY_NAME_TO_HEX[color] || DEFAULT_GROUP_COLOR;
}

// isDark: whether the UI is currently in dark mode, since the badge text
// color needs to lighten for contrast against a black background
export function groupStyle(rawColor, isDark) {
  const hex = normalizeColor(rawColor);
  const textColor = isDark ? lighten(hex, 0.35) : hex;
  return {
    hex,
    dot: { backgroundColor: hex },
    badge: {
      backgroundColor: rgba(hex, isDark ? 0.16 : 0.1),
      borderColor: rgba(hex, isDark ? 0.45 : 0.28),
      color: textColor,
    },
    ring: { "--tw-ring-color": hex },
    avatar: {
      backgroundColor: rgba(hex, isDark ? 0.22 : 0.14),
      color: textColor,
    },
  };
}
