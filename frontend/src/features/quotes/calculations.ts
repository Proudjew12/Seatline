import { BILLING_OPTIONS, QUOTE_LIMITS } from "./types";
import type { QuoteLine, QuoteTotals } from "./types";

export { BILLING_OPTIONS } from "./types";

const MAX_UNIT_PRICE_CENTS = 100_000_000;
const MAX_QUANTITY = 9999;
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function parsePriceCents(value: string): number | null {
  const normalized = value.trim();
  if (
    normalized.length > QUOTE_LIMITS.numericInput ||
    !/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(normalized)
  ) {
    return null;
  }
  const [whole = "0", fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 0 && cents <= MAX_UNIT_PRICE_CENTS
    ? cents
    : null;
}

export function parseQuantity(value: string): number | null {
  const normalized = value.trim();
  if (normalized.length > QUOTE_LIMITS.numericInput || !/^\d+$/.test(normalized)) return null;
  const quantity = Number(normalized);
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY
    ? quantity
    : null;
}

export function parseMarkupBasisPoints(value: string): number | null {
  const basisPoints = parsePriceCents(value);
  return basisPoints !== null && basisPoints <= 10_000 ? basisPoints : null;
}

export function getLineError(line: QuoteLine): string | null {
  if (!line.productName.trim() || line.productName.length > QUOTE_LIMITS.name) {
    return "Choose a product.";
  }
  if (!line.licenseName.trim() || line.licenseName.length > QUOTE_LIMITS.name) {
    return "Enter a license name (up to 200 characters).";
  }
  if (!BILLING_OPTIONS.some((option) => option.id === line.billing)) {
    return "Choose a billing option.";
  }
  if (parseQuantity(line.quantity) === null) {
    return "Enter a whole-number quantity from 1 to 9,999.";
  }
  if (parsePriceCents(line.unitPrice) === null) {
    return "Enter a USD price from 0 to 1,000,000 with up to two decimal places.";
  }
  if (parseMarkupBasisPoints(line.markupPercent ?? "0") === null) {
    return "Enter a profit rate from 0 to 100% with up to two decimal places.";
  }
  return null;
}

export interface LineCalculation {
  valid: boolean;
  baseUnitCents: number;
  customerUnitCents: number;
  markupUnitCents: number;
  baseSubtotalCents: number;
  markupSubtotalCents: number;
  subtotalCents: number;
}

function invalidLine(): LineCalculation {
  return {
    valid: false, baseUnitCents: 0, customerUnitCents: 0, markupUnitCents: 0,
    baseSubtotalCents: 0, markupSubtotalCents: 0, subtotalCents: 0,
  };
}

export function calculateLine(line: QuoteLine): LineCalculation {
  const quantity = parseQuantity(line.quantity);
  const price = parsePriceCents(line.unitPrice);
  const markup = parseMarkupBasisPoints(line.markupPercent ?? "0");
  if (getLineError(line) !== null || quantity === null || price === null || markup === null) {
    return invalidLine();
  }
  // Round each customer unit to cents before quantity so the displayed rate and total agree.
  const customerUnitCents = Math.floor((price * (10_000 + markup) + 5_000) / 10_000);
  const markupUnitCents = customerUnitCents - price;
  const subtotalCents = quantity * customerUnitCents;
  const baseSubtotalCents = quantity * price;
  const markupSubtotalCents = subtotalCents - baseSubtotalCents;
  return [customerUnitCents, subtotalCents, baseSubtotalCents, markupSubtotalCents].every(Number.isSafeInteger)
    ? { valid: true, baseUnitCents: price, customerUnitCents, markupUnitCents,
      baseSubtotalCents, markupSubtotalCents, subtotalCents }
    : invalidLine();
}

export function calculateQuote(lines: QuoteLine[]): QuoteTotals {
  let monthlyCents = 0;
  let annualUpfrontCents = 0;
  let valid = lines.length > 0 && lines.length <= QUOTE_LIMITS.lines;
  for (const line of lines) {
    const result = calculateLine(line);
    valid = valid && result.valid;
    if (line.billing === "annual-upfront") annualUpfrontCents += result.subtotalCents;
    else monthlyCents += result.subtotalCents;
  }
  const dueNowCents = monthlyCents + annualUpfrontCents;
  const yearEstimateCents = monthlyCents * 12 + annualUpfrontCents;
  if (![monthlyCents, annualUpfrontCents, dueNowCents, yearEstimateCents].every(Number.isSafeInteger)) {
    return { monthlyCents: 0, annualUpfrontCents: 0, dueNowCents: 0, yearEstimateCents: 0, valid: false };
  }
  return { monthlyCents, annualUpfrontCents, dueNowCents, yearEstimateCents, valid };
}

export function formatMoney(cents: number): string {
  return Number.isSafeInteger(cents) && cents >= 0 ? usd.format(cents / 100) : "—";
}
