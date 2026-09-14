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
  const payments: { label: string; calculation: string; amount: number }[] = [];
  if (draft.lines.some((line) => line.billing !== "annual-upfront")) {
    payments.push({
      label: "Paid monthly",
      calculation: layout.t("{amount} × 12 payments", { amount: formatMoney(totals.monthlyCents) }),
      amount: totals.yearEstimateCents - totals.annualUpfrontCents,
    });
  }
  if (draft.lines.some((line) => line.billing === "annual-upfront")) {
    payments.push({
      label: "Paid yearly",
      calculation: layout.t("{amount} × 1 payment", { amount: formatMoney(totals.annualUpfrontCents) }),
      amount: totals.annualUpfrontCents,
    });
  }
  const height = 8 + payments.length * 9 + 18;
  layout.ensureSpace(height);
  const top = layout.y;
  layout.fill(PDF_PAGE.left, top, PDF_PAGE.width, 8);
  layout.text(layout.t("Billing schedule"), 22, top + 5.4, 48, 7.5, "bold", PDF_COLORS.muted);
  layout.text(layout.t("Payment calculation"), 78, top + 5.4, 67, 7.5, "bold", PDF_COLORS.muted);
  layout.right(layout.t("12-month cost"), 151, top + 5.4, 37, 7.5, "bold", PDF_COLORS.muted);
  payments.forEach(({ label, calculation, amount }, index) => {
    const y = top + 14 + index * 9;
    layout.text(layout.t(label), 22, y, 48, 8.5, "bold");
    layout.text(calculation, 78, y, 67, 8.5);
    layout.right(formatMoney(amount), 151, y, 37, 9, "bold");
  });
  const totalY = top + 8 + payments.length * 9 + 4;
  layout.fill(PDF_PAGE.left, totalY, PDF_PAGE.width, 14);
  layout.fill(PDF_PAGE.left, totalY, 0.8, 14, PDF_COLORS.accent);
  layout.text(layout.t("Estimated total for 12 months"), 22, totalY + 9, 106, 10, "bold");
  layout.right(formatMoney(totals.yearEstimateCents), 136, totalY + 9, 52, 14, "bold");
  layout.y = top + height + 7;
}

export function writeQuoteNotes(layout: QuotePdfLayout, notes: string): void {
  if (!notes.trim()) return;
  layout.label("Notes");
  layout.paragraph(notes.trim(), 9, PDF_COLORS.muted);
}
