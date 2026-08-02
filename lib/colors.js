// Tailwind needs literal class strings to detect them at build time, so every
// class used for a group color must appear here verbatim (no template
// interpolation of color names elsewhere in the app).
export const GROUP_COLORS = {
  pink: {
    dot: "bg-pink-500",
    badge: "bg-pink-50 text-pink-700 border-pink-200",
    ring: "ring-pink-500",
    gradient: "from-pink-500 to-rose-500",
  },
  indigo: {
    dot: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    ring: "ring-indigo-500",
    gradient: "from-indigo-500 to-violet-500",
  },
  teal: {
    dot: "bg-teal-500",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    ring: "ring-teal-500",
    gradient: "from-teal-500 to-emerald-500",
  },
  amber: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    ring: "ring-amber-500",
    gradient: "from-amber-500 to-orange-500",
  },
  violet: {
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    ring: "ring-violet-500",
    gradient: "from-violet-500 to-purple-500",
  },
  emerald: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ring: "ring-emerald-500",
    gradient: "from-emerald-500 to-teal-500",
  },
  sky: {
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    ring: "ring-sky-500",
    gradient: "from-sky-500 to-indigo-500",
  },
  rose: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    ring: "ring-rose-500",
    gradient: "from-rose-500 to-pink-500",
  },
};

export const GROUP_COLOR_NAMES = Object.keys(GROUP_COLORS);

export function colorFor(name) {
  return GROUP_COLORS[name] || GROUP_COLORS.pink;
}
