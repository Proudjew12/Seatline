export type BillingOption = "monthly" | "annual-monthly" | "annual-upfront";

export interface QuoteLine {
  id: string;
  productId: string;
  // Older saved lines have no catalog link and keep manual prices.
  licenseId?: string;
  productName: string;
  licenseName: string;
  billing: BillingOption;
  quantity: string;
  // This is the internal base cost; customer prices are calculated with markup.
  unitPrice: string;
  // Older drafts have no markup and retain their original customer prices.
  markupPercent?: string;
}

export interface QuoteDraft {
  version: 1;
  // Keep automatic numbering independent of the editable reference; older drafts omit it.
  sequence?: number;
  reference: string;
  customer: string;
  notes: string;
  date: string;
  lines: QuoteLine[];
}

export interface QuoteTotals {
  monthlyCents: number;
  annualUpfrontCents: number;
  dueNowCents: number;
  yearEstimateCents: number;
  valid: boolean;
}

export const BILLING_OPTIONS: ReadonlyArray<{
  id: BillingOption;
  label: string;
  description: string;
  unitLabel: string;
}> = [
  {
    id: "monthly",
    label: "Monthly — Pay Monthly",
    description: "A one-month subscription, billed monthly.",
    unitLabel: "per license / month",
  },
  {
    id: "annual-monthly",
    label: "Annual — Pay Monthly",
    description: "A 12-month subscription, billed monthly.",
    unitLabel: "per license / month",
  },
  {
    id: "annual-upfront",
    label: "Annual — Pay Yearly",
    description: "A 12-month subscription, paid in full at the start of each year.",
    unitLabel: "per license / year",
  },
];

export const QUOTE_LIMITS = {
  lines: 100,
  customer: 200,
  notes: 4000,
  reference: 64,
  name: 200,
  id: 128,
  numericInput: 32,
} as const;
