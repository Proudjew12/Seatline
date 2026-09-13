import { BILLING_OPTIONS, QUOTE_LIMITS } from "./types";
import type { QuoteDraft, QuoteLine } from "./types";

export const QUOTE_STORAGE_KEY = "seatline.quote.v1";
const LEGACY_QUOTE_STORAGE_KEY = "saleprice.quote.v1";
const MAX_STORED_CHARACTERS = 120_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function isStoredLine(value: unknown): value is QuoteLine {
  return (
    isRecord(value) &&
    isText(value.id, QUOTE_LIMITS.id) && value.id.length > 0 &&
    isText(value.productId, QUOTE_LIMITS.id) &&
    (value.licenseId === undefined ||
      (isText(value.licenseId, QUOTE_LIMITS.id) && value.licenseId.length > 0)) &&
    isText(value.productName, QUOTE_LIMITS.name) &&
    isText(value.licenseName, QUOTE_LIMITS.name) &&
    BILLING_OPTIONS.some((option) => option.id === value.billing) &&
    isText(value.quantity, QUOTE_LIMITS.numericInput) &&
    isText(value.unitPrice, QUOTE_LIMITS.numericInput) &&
    (value.markupPercent === undefined || isText(value.markupPercent, QUOTE_LIMITS.numericInput)) &&
    (value.discountPercent === undefined || isText(value.discountPercent, QUOTE_LIMITS.numericInput))
  );
}

export function isQuoteDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isQuoteDraft(value: unknown): value is QuoteDraft {
  if (
    !isRecord(value) || value.version !== 1 ||
    (value.sequence !== undefined && (
      typeof value.sequence !== "number" || !Number.isSafeInteger(value.sequence) || value.sequence < 1
    )) ||
    !isText(value.reference, QUOTE_LIMITS.reference) ||
    !isText(value.customer, QUOTE_LIMITS.customer) ||
    !isText(value.notes, QUOTE_LIMITS.notes) ||
    !isText(value.date, 10) || !isQuoteDate(value.date) ||
    !Array.isArray(value.lines) || value.lines.length > QUOTE_LIMITS.lines ||
    !value.lines.every(isStoredLine)
  ) {
    return false;
  }
  return new Set(value.lines.map((line: QuoteLine) => line.id)).size === value.lines.length;
}

export function formatQuoteReference(sequence: number): string {
  return `SP-${String(sequence).padStart(4, "0")}`;
}

export function createDraft(sequence = 1): QuoteDraft {
  const today = new Date();
  const date = [
    String(today.getFullYear()),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return {
    version: 1,
    sequence,
    reference: formatQuoteReference(sequence),
    customer: "",
    notes: "",
    date,
    lines: [],
  };
}

export function loadDraft(): { draft: QuoteDraft; warning: string | null; } {
  try {
    const current = localStorage.getItem(QUOTE_STORAGE_KEY);
    const stored = current ?? localStorage.getItem(LEGACY_QUOTE_STORAGE_KEY);
    if (stored === null) return { draft: createDraft(), warning: null };
    if (stored.length <= MAX_STORED_CHARACTERS) {
      const parsed: unknown = JSON.parse(stored);
      if (isQuoteDraft(parsed)) {
        const warning = current === null && !saveDraft(parsed)
          ? "Your saved quote was loaded, but changes may not be kept on this device." : null;
        const emptyLegacyDraft = parsed.sequence === undefined &&
          /^SP-\d{8}-[A-F0-9]{8}$/.test(parsed.reference) &&
          !parsed.customer && !parsed.notes && parsed.lines.length === 0;
        if (emptyLegacyDraft) {
          const { sequence, reference } = createDraft();
          return { draft: { ...parsed, sequence, reference }, warning };
        }
        return { draft: parsed, warning };
      }
    }
    return { draft: createDraft(), warning: "The saved quote could not be read. A new draft is ready." };
  } catch {
    return {
      draft: createDraft(),
      warning: "The saved quote is unavailable. Changes may not be kept after you leave this page.",
    };
  }
}

export function saveDraft(draft: QuoteDraft): boolean {
  if (!isQuoteDraft(draft)) return false;
  try {
    const serialized = JSON.stringify(draft);
    if (serialized.length > MAX_STORED_CHARACTERS) return false;
    localStorage.setItem(QUOTE_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
