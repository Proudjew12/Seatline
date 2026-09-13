import { pdfMessages } from "./pdfMessages";
import { quoteMessages } from "./quoteMessages";
import { settingsMessages } from "./settingsMessages";
import type { Locale, TranslationValues } from "./types";
import { uiMessages } from "./uiMessages";

const hebrew: Readonly<Record<string, string>> = {
  ...uiMessages, ...settingsMessages, ...quoteMessages, ...pdfMessages,
};

export function translate(locale: Locale, message: string, values?: TranslationValues): string {
  const template = locale === "he" ? hebrew[message] ?? message : message;
  return template.replace(/\{(\w+)\}/g, (placeholder: string, key: string) =>
    values?.[key] === undefined ? placeholder : String(values[key]));
}
