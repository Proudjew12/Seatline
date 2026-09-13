import type { Locale } from "@/shared/i18n/types";

import { isThemeId } from "./themes";
import type { ThemeId } from "./themes";

export const TEXT_SIZES = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150] as const;
export type TextSize = typeof TEXT_SIZES[number];
export type Theme = "light" | "dark";

export interface SavedDisplayPreferences {
  textSize: TextSize;
  locale: Locale;
  theme: Theme;
  themeId: ThemeId;
}

const STORAGE_KEY = "seatline.display.v1";
const LEGACY_STORAGE_KEY = "saleprice.display.v1";
const DEFAULT_PREFERENCES: SavedDisplayPreferences = { textSize: 100, locale: "en", theme: "light", themeId: "default" };

export function isTextSize(value: unknown): value is TextSize {
  return TEXT_SIZES.some((size) => size === value);
}

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function parsePreferences(stored: string | null): SavedDisplayPreferences | null {
  if (stored === null || stored.length > 256) return null;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return {
      textSize: "textSize" in parsed && isTextSize(parsed.textSize) ? parsed.textSize : 100,
      locale: "locale" in parsed && parsed.locale === "he" ? "he" : "en",
      theme: "theme" in parsed && isTheme(parsed.theme) ? parsed.theme : "light",
      themeId: "themeId" in parsed && isThemeId(parsed.themeId) ? parsed.themeId : "default",
    };
  } catch {
    return null;
  }
}

export function loadDisplayPreferences(): SavedDisplayPreferences {
  try {
    return parsePreferences(localStorage.getItem(STORAGE_KEY))
      ?? parsePreferences(localStorage.getItem(LEGACY_STORAGE_KEY))
      ?? { ...DEFAULT_PREFERENCES };
  } catch {
    // Unavailable storage must not prevent using the workspace.
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveDisplayPreferences(preferences: SavedDisplayPreferences): boolean {
  try {
    // Retain the legacy entry so the original application can still recover its preference.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
