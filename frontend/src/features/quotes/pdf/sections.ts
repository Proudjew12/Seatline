import { calculateQuote, formatMoney } from "../calculations";
import type { QuoteDraft } from "../types";
import { cleanPdfField, PDF_COLORS, PDF_PAGE, QuotePdfLayout } from "./layout";

function quoteDate(value: string, locale: QuotePdfLayout["locale"]): string {
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

export function writeQuoteHeading(layout: QuotePdfLayout, draft: QuoteDraft): void {
  layout.logoAt(PDF_PAGE.left - 0.75, 14, 54);
  layout.headerText(quoteDate(draft.date, layout.locale), 102, 24, 90, 9);
  layout.rule(36, PDF_PAGE.left, PDF_PAGE.width, true);

  const companyLabel = layout.t("Company:");
  layout.font(9);
  const labelWidth = layout.document.getTextWidth(companyLabel) + 3.5;
  const customerX = PDF_PAGE.left + labelWidth;
  const customerWidth = 118 - labelWidth;
  layout.text(companyLabel, PDF_PAGE.left, 44, labelWidth, 9, "normal", PDF_COLORS.muted);
  const customers = layout.wrap(cleanPdfField(draft.customer), customerWidth, 11, "bold");
  customers.forEach((name, index) => layout.text(name, customerX, 44 + index * 5.3, customerWidth, 11, "bold"));
  const references = layout.wrap(cleanPdfField(draft.reference), 48, 10, "bold");
  references.forEach((reference, index) => layout.end(reference, 144, 44 + index * 5.3, 48, 10, "bold"));
  layout.y = 44 + (Math.max(customers.length, references.length) - 1) * 5.3 + 8;
}

export function writeQuoteSummary(layout: QuotePdfLayout, draft: QuoteDraft): void {
  const totals = calculateQuote(draft.lines);
  layout.ensureSpace(43);
  const top = layout.y;
  const x = 88;
  const width = 104;
  const recurringPayments = [
    { label: "Monthly payment", amount: totals.monthlyCents },
    { label: "Yearly payment (upfront)", amount: totals.annualUpfrontCents },
  ];
  recurringPayments.forEach(({ label, amount }, index) => {
    const y = top + 5 + index * 8;
    layout.text(layout.t(label), x + 4, y, 56, 8.5);
    layout.right(formatMoney(amount), x + 65, y, 35, 9.5, "bold");
  });
  layout.rule(top + 18, x, width);
  layout.fill(x, top + 21, width, 12);
  layout.text(layout.t("Due at start"), x + 4, top + 29, 56, 9, "bold");
  layout.right(formatMoney(totals.dueNowCents), x + 65, top + 29, 35, 13, "bold");
  layout.text(layout.t("12-month estimate"), x + 4, top + 41, 56, 8.5, "normal", PDF_COLORS.muted);
  layout.right(formatMoney(totals.yearEstimateCents), x + 65, top + 41, 35, 9.5, "bold");
  layout.y = top + 48;
}

export function writeQuoteNotes(layout: QuotePdfLayout, notes: string): void {
  if (!notes.trim()) return;
  layout.label("Notes");
  layout.paragraph(notes.trim(), 9, PDF_COLORS.muted);
}
