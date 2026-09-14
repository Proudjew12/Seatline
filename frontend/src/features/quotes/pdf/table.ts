import { calculateLine, formatMoney } from "../calculations";
import type { BillingOption, QuoteLine } from "../types";
import { cleanPdfField, PDF_COLORS, PDF_PAGE, QuotePdfLayout } from "./layout";

const BILLING_LABELS: Record<BillingOption, string> = {
  monthly: "Paid monthly",
  "annual-monthly": "Paid monthly",
  "annual-upfront": "Paid yearly",
};

const PRODUCT_LINE_HEIGHT = 4.2;
const LICENSE_LINE_HEIGHT = 3.8;

function tableHeader(layout: QuotePdfLayout): void {
  layout.fill(PDF_PAGE.left, layout.y, PDF_PAGE.width, 8);
  const baseline = layout.y + 5.4;
  layout.text(layout.t("PRODUCT / LICENSE"), 22, baseline, 54, 7, "bold", PDF_COLORS.muted);
  layout.text(layout.t("BILLING"), 80, baseline, 26, 7, "bold", PDF_COLORS.muted);
  layout.right(layout.t("QTY"), 110, baseline, 8, 7, "bold", PDF_COLORS.muted);
  layout.right(layout.t("UNIT PRICE"), 122, baseline, 31, 7, "bold", PDF_COLORS.muted);
  layout.right(layout.t("AMOUNT"), 157, baseline, 31, 7, "bold", PDF_COLORS.muted);
  layout.y += 8;
}

function rowHeight(layout: QuotePdfLayout, line: QuoteLine): number {
  return Math.max(16, 6 + layout.wrap(cleanPdfField(line.productName), 54, 9, "bold").length * PRODUCT_LINE_HEIGHT
    + layout.wrap(cleanPdfField(line.licenseName), 54, 8).length * LICENSE_LINE_HEIGHT);
}

function writeRow(layout: QuotePdfLayout, line: QuoteLine): void {
  const calculated = calculateLine(line);
  if (!calculated.valid) throw new Error("Complete every quote line first.");
  const products = layout.wrap(cleanPdfField(line.productName), 54, 9, "bold");
  const names = layout.wrap(cleanPdfField(line.licenseName), 54, 8);
  const height = rowHeight(layout, line);
  if (layout.ensureSpace(height)) tableHeader(layout);
  const top = layout.y;
  products.forEach((product, index) => layout.text(product, 22, top + 5 + index * PRODUCT_LINE_HEIGHT, 54, 9, "bold"));
  names.forEach((name, index) =>
    layout.text(name, 22, top + 5.5 + products.length * PRODUCT_LINE_HEIGHT + index * LICENSE_LINE_HEIGHT, 54, 8, "normal", PDF_COLORS.muted));
  layout.text(layout.t(BILLING_LABELS[line.billing]), 80, top + 5, 26, 7.5, "bold");
  layout.right(String(Number(line.quantity)), 110, top + 5, 8, 8.5);
  const period = line.billing === "annual-upfront" ? "/ year" : "/ month";
  layout.right(`${formatMoney(calculated.customerUnitCents)} ${layout.t(period)}`, 122, top + 5, 31, 8);
  layout.right(`${formatMoney(calculated.subtotalCents)} ${layout.t(period)}`, 157, top + 5, 31, 8, "bold");
  layout.y += height;
  layout.rule();
}

export function writeQuoteTable(layout: QuotePdfLayout, lines: QuoteLine[]): void {
  layout.ensureSpace(8 + (lines[0] ? rowHeight(layout, lines[0]) : 16));
  tableHeader(layout);
  lines.forEach((line) => writeRow(layout, line));
  layout.y += 4;
}
