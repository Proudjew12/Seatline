import { createContext, useContext } from "react";

import { translate } from "./translate";
import type { Locale, TranslationValues } from "./types";

export const LocaleContext = createContext<Locale>("en");

export function useI18n() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    dir: locale === "he" ? "rtl" as const : "ltr" as const,
    t: (message: string, values?: TranslationValues) => translate(locale, message, values),
  };
}
