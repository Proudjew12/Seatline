import { createContext } from "react";

import type { Locale } from "@/shared/i18n/types";

import type { SavedDisplayPreferences, TextSize, Theme } from "./preferences";
import type { ThemeId } from "./themes";

interface DisplayPreferences extends SavedDisplayPreferences {
  changeTextSize: (size: TextSize) => void;
  changeLocale: (locale: Locale) => void;
  changeTheme: (theme: Theme) => void;
  changeThemeId: (themeId: ThemeId) => void;
  saveFailed: boolean;
}

export const DisplayPreferencesContext = createContext<DisplayPreferences | null>(null);
