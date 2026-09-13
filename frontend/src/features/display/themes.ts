export const THEME_GROUPS = [
  { id: "default", name: "Default" },
  { id: "color", name: "Color themes" },
  { id: "background", name: "Background themes" },
] as const;

interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  group: typeof THEME_GROUPS[number]["id"];
}

export const THEMES = [
  { id: "default", group: "default", name: "Default", description: "The original Seatline · light & dark" },
  { id: "studio", group: "color", name: "Studio", description: "Crisp white. Confident indigo." },
  { id: "midnight", group: "color", name: "Midnight", description: "Deep navy. Cool teal." },
  { id: "dune", group: "color", name: "Dune", description: "Warm sand. Earthy terracotta." },
  { id: "forest", group: "color", name: "Forest", description: "Soft sage. Grounded green." },
  { id: "plum", group: "color", name: "Plum", description: "Rich aubergine. Soft mauve." },
  { id: "aurora", group: "background", name: "Aurora", description: "Luminous silk. Lavender & cyan." },
  { id: "solstice", group: "background", name: "Solstice", description: "Sculpted dunes. A peach sunset." },
  { id: "orbit", group: "background", name: "Orbit", description: "Violet planet. An orbital glow." },
  { id: "harbor", group: "background", name: "Harbor", description: "Quiet charcoal. A coast at dusk." },
  { id: "meadow", group: "background", name: "Meadow", description: "Clear daylight. Rolling green hills." },
  { id: "alpine", group: "background", name: "Alpine", description: "Cool slate. A still mountain lake." },
  { id: "aurora-rose", group: "background", name: "Aurora Rose", description: "Pearl silk. Blush & rosewater." },
  { id: "aurora-mint", group: "background", name: "Aurora Mint", description: "Glass sails. Mint & seafoam." },
  { id: "aurora-ice", group: "background", name: "Aurora Ice", description: "Frozen ribbons. Silver & blue." },
  { id: "aurora-peach", group: "background", name: "Aurora Peach", description: "Warm satin. Apricot & honey." },
  { id: "aurora-dusk", group: "background", name: "Aurora Dusk", description: "Luminous arcs. Amethyst & orchid." },
  { id: "aurora-ocean", group: "background", name: "Aurora Ocean", description: "Liquid glass. Deep teal & aqua." },
] as const satisfies readonly ThemeDefinition[];

export type ThemeId = typeof THEMES[number]["id"];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function getTheme(id: ThemeId) {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
