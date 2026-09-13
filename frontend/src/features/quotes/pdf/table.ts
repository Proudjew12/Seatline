import { calculateLine, formatMoney } from "../calculations";
import type { BillingOption, QuoteLine } from "../types";
import { cleanPdfField, PDF_COLORS, PDF_PAGE, QuotePdfLayout } from "./layout";

const BILLING_LABELS: Record<BillingOption, [string, string]> = {
  monthly: ["Monthly subscription", "Paid monthly"],
  "annual-monthly": ["Annual subscription", "Paid monthly"],
  "annual-upfront": ["Annual subscription", "Paid yearly"],
};

function tableHeader(layout: QuotePdfLayout): void {
  layout.fill(PDF_PAGE.left, layout.y, PDF_PAGE.width, 10);
  const baseline = layout.y + 6.5;
  layout.text(layout.t("PRODUCT / LICENSE"), 22, baseline, 64, 7, "bold", PDF_COLORS.muted);
  layout.text(layout.t("BILLING"), 92, baseline, 27, 7, "bold", PDF_COLORS.muted);
  layout.right(layout.t("QTY"), 123, baseline, 9, 7, "bold", PDF_COLORS.muted);
  layout.right(layout.t("UNIT PRICE"), 135, baseline, 21, 7, "bold", PDF_COLORS.muted);
  layout.right(layout.t("AMOUNT"), 159, baseline, 29, 7, "bold", PDF_COLORS.muted);
  layout.y += 10;
}

function rowHeight(layout: QuotePdfLayout, line: QuoteLine): number {
  return Math.max(20, 10 + layout.wrap(cleanPdfField(line.licenseName), 64, 9, "bold").length * 4.6 + layout.wrap(cleanPdfField(line.productName), 64, 8).length * 4.1);
}

function writeRow(layout: QuotePdfLayout, line: QuoteLine): void {
  const calculated = calculateLine(line);
  if (!calculated.valid) throw new Error("Complete every quote line first.");
  const names = layout.wrap(cleanPdfField(line.licenseName), 64, 9, "bold");
  const products = layout.wrap(cleanPdfField(line.productName), 64, 8);
  const height = rowHeight(layout, line);
  if (layout.ensureSpace(height)) tableHeader(layout);
  const top = layout.y;
  names.forEach((name, index) => layout.text(name, 22, top + 7 + index * 4.6, 64, 9, "bold"));
  products.forEach((product, index) =>
    layout.text(product, 22, top + 8.5 + names.length * 4.6 + index * 4.1, 64, 8, "normal", PDF_COLORS.muted));
  const [commitment, payment] = BILLING_LABELS[line.billing];
  layout.text(layout.t(commitment), 92, top + 7, 27, 7);
  layout.text(layout.t(payment), 92, top + 12, 27, 6.8, "normal", PDF_COLORS.muted);
  layout.right(String(Number(line.quantity)), 123, top + 7, 9, 8.5);
  layout.right(formatMoney(calculated.customerUnitCents), 135, top + 7, 21, 8.5);
  layout.right(formatMoney(calculated.subtotalCents), 159, top + 7, 29, 8.5, "bold");
  const period = line.billing === "annual-upfront" ? "/ year" : "/ month";
  layout.right(layout.t(period), 135, top + 12, 21, 7, "normal", PDF_COLORS.muted);
  layout.right(layout.t(period), 159, top + 12, 29, 7, "normal", PDF_COLORS.muted);
  layout.y += height;
  layout.rule();
}

export function writeQuoteTable(layout: QuotePdfLayout, lines: QuoteLine[]): void {
  layout.ensureSpace(16 + (lines[0] ? rowHeight(layout, lines[0]) : 20));
  layout.text(layout.t("LICENSE DETAILS"), PDF_PAGE.left, layout.y, 100, 8, "bold");
  layout.end(layout.t("All amounts in USD"), 137, layout.y, 55, 7.5, "normal", PDF_COLORS.muted);
  layout.y += 6;
  tableHeader(layout);
  lines.forEach((line) => writeRow(layout, line));
  layout.y += 10;
}
