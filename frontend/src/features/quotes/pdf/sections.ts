import { calculateQuote, formatMoney } from "../calculations";
import type { QuoteDraft } from "../types";
import { cleanPdfField, PDF_COLORS, PDF_PAGE, QuotePdfLayout } from "./layout";

function quoteDate(value: string, locale: QuotePdfLayout["locale"]): string {
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

export function writeQuoteHeading(layout: QuotePdfLayout, draft: QuoteDraft): void {
  layout.logoAt(PDF_PAGE.left - 0.75, 14, 54);
  layout.headerText(layout.t("SALES PROPOSAL"), 102, 18, 90, 7, "bold", PDF_COLORS.muted);
  const references = layout.wrap(cleanPdfField(draft.reference), 90, 11.5, "bold");
  references.forEach((reference, index) => layout.headerText(reference, 102, 24 + index * 5.3, 90, 11.5, "bold"));
  const dateY = 25 + references.length * 5.3;
  layout.headerText(layout.t("ISSUED"), 102, dateY, 90, 7, "bold", PDF_COLORS.muted);
  layout.headerText(quoteDate(draft.date, layout.locale), 102, dateY + 5, 90, 9);
  const ruleY = Math.max(36, dateY + 10);
  layout.rule(ruleY, PDF_PAGE.left, PDF_PAGE.width, true);

  layout.text(layout.t("PREPARED FOR"), PDF_PAGE.left, ruleY + 7, PDF_PAGE.width, 7.5, "bold", PDF_COLORS.muted);
  const customers = layout.wrap(cleanPdfField(draft.customer), PDF_PAGE.width, 11.5, "bold");
  const customerY = ruleY + 13;
  customers.forEach((name, index) => layout.text(name, PDF_PAGE.left, customerY + index * 5.5, PDF_PAGE.width, 11.5, "bold"));
  layout.y = customerY + (customers.length - 1) * 5.5 + 9;
}

export function writeQuoteSummary(layout: QuotePdfLayout, draft: QuoteDraft): void {
  const totals = calculateQuote(draft.lines);
  layout.ensureSpace(22);
  const top = layout.y;
  const columnWidth = PDF_PAGE.width / 4;
  const payments = [
    { label: "Monthly payments", amount: totals.monthlyCents },
    { label: "Yearly payments", amount: totals.annualUpfrontCents },
    { label: "DUE AT START", amount: totals.dueNowCents },
    { label: "12-month estimate", amount: totals.yearEstimateCents },
  ];
  layout.fill(PDF_PAGE.left, top, PDF_PAGE.width, 22);
  payments.forEach(({ label, amount }, index) => {
    const x = PDF_PAGE.left + index * columnWidth;
    const dueNow = label === "DUE AT START";
    if (dueNow) layout.fill(x, top, 0.8, 22, PDF_COLORS.accent);
    layout.text(layout.t(label), x + 4, top + 6, columnWidth - 8, 7, "normal", PDF_COLORS.muted);
    layout.text(formatMoney(amount), x + 4, top + 15, columnWidth - 8, dueNow ? 12 : 11, "bold");
  });
  layout.y = top + 28;
}

export function writeQuoteNotes(layout: QuotePdfLayout, notes: string): void {
  if (!notes.trim()) return;
  layout.label("Notes");
  layout.paragraph(notes.trim(), 9, PDF_COLORS.muted);
}
