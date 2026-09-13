import type { jsPDF } from "jspdf";

import { translate } from "@/shared/i18n/translate";
import type { Locale } from "@/shared/i18n/types";

import { calculateQuote } from "./calculations";
import { loadPdfLogo } from "./pdf/brand";
import { loadPdfFonts, registerPdfFonts } from "./pdf/font";
import { cleanPdfField, QuotePdfLayout } from "./pdf/layout";
import { writeQuoteHeading, writeQuoteNotes, writeQuoteSummary } from "./pdf/sections";
import { writeQuoteTable } from "./pdf/table";
import { isQuoteDate, isQuoteDraft } from "./storage";
import type { QuoteDraft } from "./types";

export async function buildQuotePdf(draft: QuoteDraft, locale: Locale = "en"): Promise<jsPDF> {
  if (
    !isQuoteDraft(draft) || !cleanPdfField(draft.customer) ||
    !cleanPdfField(draft.reference) || !isQuoteDate(draft.date) ||
    !calculateQuote(draft.lines).valid
  ) {
    throw new Error("Enter a customer, reference, and date, and complete every quote line before exporting.");
  }
  const [{ jsPDF }, fonts, logo] = await Promise.all([import("jspdf"), loadPdfFonts(), loadPdfLogo()]);
  const document = new jsPDF({ unit: "mm", format: "a4", compress: true, putOnlyUsedFonts: true });
  registerPdfFonts(document, fonts);
  document.setProperties({ title: `${translate(locale, "Software License Quotation")} ${cleanPdfField(draft.reference)}`, author: "Logi", creator: "Logi" });
  document.viewerPreferences({ Direction: locale === "he" ? "R2L" : "L2R" });
  const layout = new QuotePdfLayout(document, cleanPdfField(draft.reference), logo, locale);
  writeQuoteHeading(layout, draft);
  writeQuoteTable(layout, draft.lines);
  writeQuoteSummary(layout, draft);
  writeQuoteNotes(layout, draft.notes);
  layout.finish();
  return document;
}

export async function exportQuotePdf(draft: QuoteDraft, locale: Locale = "en"): Promise<void> {
  const document = await buildQuotePdf(draft, locale);
  const reference = draft.reference.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
  await document.save(`Logi-${reference || "quote"}.pdf`, { returnPromise: true });
}
