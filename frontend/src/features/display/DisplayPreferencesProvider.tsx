import { useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";

import { LocaleContext } from "@/shared/i18n/context";
import type { Locale } from "@/shared/i18n/types";

import { DisplayPreferencesContext } from "./context";
import { loadDisplayPreferences, saveDisplayPreferences } from "./preferences";
import type { SavedDisplayPreferences, TextSize, Theme } from "./preferences";
import type { ThemeId } from "./themes";

export function DisplayPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(loadDisplayPreferences);
  const [saveFailed, setSaveFailed] = useState(false);
  const { textSize, locale, theme, themeId } = preferences;

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = { lang: root.lang, dir: root.dir, theme: root.dataset.theme, themeId: root.dataset.themeId, title: document.title };
    root.style.setProperty("--text-scale", String(textSize / 100));
    root.lang = locale;
    root.dir = locale === "he" ? "rtl" : "ltr";
    root.dataset.theme = themeId === "default" ? theme : themeId;
    root.dataset.themeId = themeId;
    document.title = "Seatline";
    return () => {
      root.style.removeProperty("--text-scale");
      root.lang = previous.lang;
      root.dir = previous.dir;
      if (previous.theme === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous.theme;
      if (previous.themeId === undefined) delete root.dataset.themeId;
      else root.dataset.themeId = previous.themeId;
      document.title = previous.title;
    };
  }, [textSize, locale, theme, themeId]);

  function changePreferences(patch: Partial<SavedDisplayPreferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setSaveFailed(!saveDisplayPreferences(next));
  }

  function changeTextSize(size: TextSize) {
    changePreferences({ textSize: size });
  }

  function changeLocale(nextLocale: Locale) {
    changePreferences({ locale: nextLocale });
  }

  function changeTheme(nextTheme: Theme) {
    changePreferences({ theme: nextTheme });
  }

  function changeThemeId(nextThemeId: ThemeId) {
    changePreferences({ themeId: nextThemeId });
  }

  return (
    <DisplayPreferencesContext value={{ ...preferences, changeTextSize, changeLocale, changeTheme, changeThemeId, saveFailed }}>
      <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
    </DisplayPreferencesContext>
  );
}
