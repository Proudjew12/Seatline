import { calculateQuote, formatMoney } from "../calculations";
import type { QuoteDraft } from "../types";
import { cleanPdfField, PDF_COLORS, PDF_PAGE, QuotePdfLayout } from "./layout";

function quoteDate(value: string, locale: QuotePdfLayout["locale"]): string {
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

export function writeQuoteHeading(layout: QuotePdfLayout, draft: QuoteDraft): void {
  layout.logoAt(PDF_PAGE.left - 0.75, 16, 54);
  layout.end(layout.t("QUOTATION"), 102, 26, 90, 21, "bold");
  layout.end(layout.t("Software licenses"), 102, 33, 90, 9, "normal", PDF_COLORS.muted);
  layout.rule(45, PDF_PAGE.left, PDF_PAGE.width, true);

  layout.text(layout.t("PREPARED FOR"), PDF_PAGE.left, 57, 92, 7.5, "bold", PDF_COLORS.muted);
  const customers = layout.wrap(cleanPdfField(draft.customer), 95, 12, "bold");
  customers.forEach((name, index) => layout.text(name, PDF_PAGE.left, 65 + index * 5.8, 95, 12, "bold"));
  layout.text(layout.t("SALES PROPOSAL"), 126, 57, 66, 7, "bold", PDF_COLORS.muted);
  const references = layout.wrap(cleanPdfField(draft.reference), 66, 9.5);
  references.forEach((reference, index) => layout.text(reference, 126, 64 + index * 4.6, 66, 9.5));
  const dateY = 69 + references.length * 4.6;
  layout.text(layout.t("ISSUED"), 126, dateY, 66, 7, "bold", PDF_COLORS.muted);
  layout.text(quoteDate(draft.date, layout.locale), 126, dateY + 6, 66, 9);
  layout.y = Math.max(65 + customers.length * 5.8, dateY + 6) + 14;
}

export function writeQuoteSummary(layout: QuotePdfLayout, draft: QuoteDraft): void {
  const totals = calculateQuote(draft.lines);
  layout.ensureSpace(65);
  const top = layout.y;
  layout.text(layout.t("PAYMENT SUMMARY"), PDF_PAGE.left, top + 4, 75, 8, "bold");
  const terms = [
    "Prices are in USD and exclude taxes.",
    "Annual subscriptions carry a 12-month commitment.",
    "Amount due at start includes the first monthly payment and each yearly payment in full.",
    "The 12-month estimate assumes monthly subscriptions continue for 12 months.",
  ];
  let termsY = top + 12;
  for (const term of terms) {
    const lines = layout.wrap(layout.t(term), 70, 7.5);
    lines.forEach((line, index) => layout.text(line, PDF_PAGE.left, termsY + index * 3.8, 70, 7.5, "normal", PDF_COLORS.muted));
    termsY += lines.length * 3.8 + 2.5;
  }

  const summaryX = 101;
  layout.text(layout.t("Monthly payments"), summaryX, top + 4, 51, 8);
  layout.right(formatMoney(totals.monthlyCents), 153, top + 4, 39, 9, "bold");
  layout.text(layout.t("Yearly payments"), summaryX, top + 12, 51, 8);
  layout.right(formatMoney(totals.annualUpfrontCents), 153, top + 12, 39, 9, "bold");
  layout.rule(top + 17, summaryX, 91);
  layout.fill(summaryX, top + 21, 91, 20);
  layout.fill(summaryX, top + 21, 1, 20, PDF_COLORS.accent);
  layout.text(layout.t("DUE AT START"), summaryX + 5, top + 27, 81, 7, "bold", PDF_COLORS.muted);
  layout.right(formatMoney(totals.dueNowCents), summaryX + 5, top + 36, 81, 16, "bold");
  layout.text(layout.t("12-month estimate"), summaryX, top + 49, 47, 8);
  layout.right(formatMoney(totals.yearEstimateCents), 148, top + 49, 44, 9, "bold");
  layout.y = Math.max(top + 57, termsY) + 8;
}

export function writeQuoteNotes(layout: QuotePdfLayout, notes: string): void {
  if (!notes.trim()) return;
  layout.label("Notes");
  layout.paragraph(notes.trim(), 9, PDF_COLORS.muted);
}
