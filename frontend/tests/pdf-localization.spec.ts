import { writeFile } from "node:fs/promises";

import type { Page, TestInfo } from "@playwright/test";

import { expect, test } from "./fixtures";
import { readPdfContent } from "./pdf-content";
import type { PdfContent, PdfText } from "./pdf-content";

function expectLeftLogos({ text, logos }: PdfContent): void {
  const pointsPerMm = 72 / 25.4;
  const pageCount = Math.max(...text.map((item) => item.page));
  expect(logos).toHaveLength(pageCount);
  for (let page = 1; page <= pageCount; page += 1) {
    const logo = logos.find((item) => item.page === page);
    expect(logo, `Page ${page} has its branding image`).toBeDefined();
    if (!logo) throw new Error(`Missing logo on page ${page}`);
    expect(logo.x).toBeCloseTo((page === 1 ? 17.25 : 17.5) * pointsPerMm, 3);
    expect(logo.width).toBeCloseTo((page === 1 ? 54 : 34) * pointsPerMm, 3);
    const headerText = text.filter((item) => item.page === page && item.y >= logo.y && item.y <= logo.y + logo.height);
    if (page === 1) expect(headerText).toHaveLength(1);
    else expect(headerText.length).toBeGreaterThanOrEqual(1);
    for (const item of headerText) {
      expect(item.x, `Header "${item.text}" stays clear of the left logo`).toBeGreaterThan(logo.x + logo.width);
    }
  }
}

function expectCompactCaptions(text: PdfText[]): void {
  const values = text.map((item) => item.text);
  for (const caption of [
    "QUOTATION", "Software licenses", "SOFTWARE LICENSE QUOTATION", "All amounts in USD", "PAYMENT SUMMARY",
    "ISSUED", "SALES PROPOSAL", "PREPARED FOR", "LICENSE DETAILS", "Monthly payments", "Yearly payments",
    "ריחמ תעצה", "הנכות תונוישיר", "הנכות תונוישירל ריחמ תעצה", "ב״הרא רלודב םימוכסה לכ", "םימולשת םוכיס",
    "הקפה ךיראת", "הריכמ תעצה", "דובכל", "תונוישיר טוריפ",
    "Due at start", "DUE AT START", "Monthly payment", "Yearly payment (upfront)", "12-month estimate",
    "Monthly subscription", "Annual subscription", "הפוקתה תליחתב םולשתל", "ישדוח יונימ", "יתנש יונימ",
  ]) expect(values).not.toContain(caption);
  expect(values.join(" ")).not.toMatch(/Prices are in USD|exclude taxes|Annual subscriptions carry|Amount due at start includes|estimate assumes|םיסמ|תובייחתה|ןושארה|וכשמיי|upfront|שארמ/);
}

function expectCompactHeader(content: PdfContent, locale: "en" | "he", reference = "SEAT-2026-001") {
  expectLeftLogos(content);
  expectCompactCaptions(content.text);
  const pointsPerMm = 72 / 25.4;
  const page = content.text.filter((item) => item.page === 1);
  const company = page.find((item) => item.text === (locale === "en" ? "Company:" : ":הרבח"));
  const table = page.find((item) => item.text === (locale === "en" ? "PRODUCT / LICENSE" : "ןוישיר / רצומ"));
  const date = page.find((item) => item.text.includes(locale === "en" ? "September" : "רבמטפס"));
  const logo = content.logos[0];
  expect(company).toBeDefined();
  expect(table).toBeDefined();
  expect(date).toBeDefined();
  if (!company || !table || !date || !logo) throw new Error("Company, date, and license table are required");
  const row = page.filter((item) => item.y <= company.y + 0.01 && item.y > table.y);
  const references = row.filter((item) => item.x >= (locale === "en" ? 144 : 18) * pointsPerMm - 0.1
    && item.x + item.width <= (locale === "en" ? 192 : 66) * pointsPerMm + 0.1);
  const customers = row.filter((item) => item !== company && !references.includes(item));
  expect(references.map((item) => item.text).join("")).toBe(reference);
  expect(customers.length).toBeGreaterThan(0);
  expect(customers[0].y).toBeCloseTo(company.y, 3);
  expect(references[0].y).toBeCloseTo(company.y, 3);
  expect(company.y).toBeCloseTo((297 - 44) * pointsPerMm, 3);
  expect(date.y).toBeCloseTo((297 - 24) * pointsPerMm, 3);
  expect(date.x).toBeGreaterThanOrEqual(102 * pointsPerMm);
  expect(page.filter((item) => item.y > company.y + 0.01)).toEqual([date]);
  const labelGap = locale === "en" ? customers[0].x - company.x - company.width : company.x - customers[0].x - customers[0].width;
  expect(labelGap).toBeGreaterThan(3 * pointsPerMm);
  expect(labelGap).toBeLessThan(4 * pointsPerMm);
  for (const item of customers) {
    expect(item.x).toBeGreaterThanOrEqual((locale === "en" ? 18 : 74) * pointsPerMm - 0.1);
    expect(item.x + item.width).toBeLessThanOrEqual((locale === "en" ? 136 : 192) * pointsPerMm + 0.1);
  }
  expect(table.y).toBeLessThan(Math.min(...row.map((item) => item.y)));
  expect(date.text).toContain("2026");
  expect(date.text).toContain("11");
  return { company, customers, references, table };
}

function inColumn(item: PdfText, locale: "en" | "he", x: number, width: number): boolean {
  const start = locale === "en" ? x : 210 - x - width;
  return item.x >= start * 72 / 25.4 - 0.1 && item.x + item.width <= (start + width) * 72 / 25.4 + 0.1;
}

function paymentLabel(locale: "en" | "he", yearly: boolean): string {
  return locale === "en" ? yearly ? "Paid yearly" : "Paid monthly" : yearly ? "יתנש םולשתב" : "ישדוח םולשתב";
}

interface PaymentGroup { yearly: boolean; payment: string; cost: string }

function expectPaymentBreakdown(content: PdfContent, locale: "en" | "he", groups: PaymentGroup[], total: string): void {
  expectCompactCaptions(content.text);
  const header = content.text.find((item) => item.text === (locale === "en" ? "Payment calculation" : "םימולשתה בושיח"));
  const label = content.text.find((item) => locale === "en" ? item.text === "Estimated total for 12 months" : item.text.includes("רעושמ") && item.text.includes("12"));
  if (!header || !label) throw new Error("A payment breakdown and estimated annual total are required");
  expect(header.page).toBe(label.page);
  const headers = content.text.filter((item) => item.page === header.page && Math.abs(item.y - header.y) < 0.01);
  expect(headers).toHaveLength(3);
  expect(headers.some((item) => item.text === (locale === "en" ? "Billing schedule" : "םולשת תורידת"))).toBe(true);
  expect(headers.some((item) => locale === "en" ? item.text === "12-month cost" : item.text.includes("תולע") && item.text.includes("12"))).toBe(true);
  const rows = content.text.filter((item) => item.page === header.page && item.y < header.y && item.y > label.y);
  expect(rows).toHaveLength(groups.length * 3);
  groups.forEach((group, index) => {
    const billing = rows.find((item) => item.text === paymentLabel(locale, group.yearly));
    if (!billing) throw new Error(`Missing billing category: ${paymentLabel(locale, group.yearly)}`);
    const row = rows.filter((item) => Math.abs(item.y - billing.y) < 0.01);
    const formula = row.find((item) => inColumn(item, locale, 78, 67));
    const cost = row.find((item) => inColumn(item, locale, 151, 37));
    if (!formula || !cost) throw new Error("Each payment category needs its calculation and annualized cost");
    expect(inColumn(billing, locale, 22, 48)).toBe(true);
    if (locale === "en") expect(formula.text).toBe(`${group.payment} × ${group.yearly ? "1 payment" : "12 payments"}`);
    else {
      expect(formula.text).toContain(group.payment);
      expect(formula.text).toContain("×");
      expect(formula.text).toContain(group.yearly ? "דחא םולשת" : "םימולשת 12");
    }
    expect(cost.text).toBe(group.cost);
    expect(cost.x + cost.width).toBeCloseTo((locale === "en" ? 188 : 59) * 72 / 25.4, 0);
    expect(header.y - billing.y).toBeCloseTo((8.6 + index * 9) * 72 / 25.4, 3);
  });
  const amount = content.text.find((item) => item.page === label.page && Math.abs(item.y - label.y) < 0.01 && inColumn(item, locale, 136, 52));
  expect(amount?.text).toBe(total);
  expect(amount?.fontSize).toBeGreaterThan(12);
}

function expectLicenseRows(content: PdfContent, locale: "en" | "he", periods: boolean[], unit: string, amount: string): void {
  const products = content.text.filter((item) => item.text === "Microsoft 365");
  expect(products).toHaveLength(periods.length);
  const company = content.text.find((item) => item.text === (locale === "en" ? "Company:" : ":הרבח"));
  const title = content.text.find((item) => item.text === (locale === "en" ? "PRODUCT / LICENSE" : "ןוישיר / רצומ"));
  if (!company || !title) throw new Error("Company and product headings must be present");
  products.forEach((product, index) => {
    const license = content.text[content.text.indexOf(product) + 1];
    expect(product.fontSize).toBe(9);
    expect(product.font).toBe(title.font);
    expect(license.text).toContain("Business Basic");
    expect(license.fontSize).toBe(8);
    expect(license.font).toBe(company.font);
    expect(license.y).toBeLessThan(product.y);
    const row = content.text.filter((item) => item.page === product.page && Math.abs(item.y - product.y) < 0.01);
    const billing = row.find((item) => inColumn(item, locale, 80, 26));
    expect(billing?.text).toBe(paymentLabel(locale, periods[index]));
    expect(billing?.font).toBe(product.font);
    for (const [x, price] of [[122, unit], [157, amount]] as const) {
      const cells = row.filter((item) => inColumn(item, locale, x, 31));
      expect(cells).toHaveLength(1);
      const period = locale === "en" ? periods[index] ? "/ year" : "/ month" : periods[index] ? "הנשל" : "שדוחל";
      expect(cells[0].text).toContain(price);
      expect(cells[0].text).toContain(period);
      expect(cells[0].font).toBe(x === 122 ? company.font : product.font);
      if (locale === "en") expect(cells[0].text).toBe(`${price} ${period}`);
    }
  });
}

interface QuoteScenario {
  long?: boolean;
  lineCount?: number;
  billings?: ("monthly" | "annual-monthly" | "annual-upfront")[];
  unitPrice?: string;
  productName?: string;
  licenseName?: string;
  customer?: string;
  reference?: string;
  notes?: string;
  markupPercent?: string;
  discountPercent?: string;
}

async function renderQuote(page: Page, testInfo: TestInfo, locale: "en" | "he", scenario: QuoteScenario = {}): Promise<PdfContent> {
  await page.goto("/");
  const encoded = await page.evaluate(async ({ locale, scenario }) => {
    const { long = false, markupPercent = "17", discountPercent = "0" } = scenario;
    const modulePath = "/src/features/quotes/exportPdf.ts";
    const { buildQuotePdf } = await import(modulePath) as {
      buildQuotePdf: (draft: object, locale: "en" | "he") => Promise<{ output: (format: "datauristring") => string }>;
    };
    const document = await buildQuotePdf({
      version: 1, reference: scenario.reference ?? "SEAT-2026-001", date: "2026-09-11",
      customer: scenario.customer ?? "דוד כהן",
      notes: scenario.notes ?? (long ? `${"הערות עבור Microsoft 365 ומספר 12345. ".repeat(70)}\nEnd of notes 98765.` : "שירות עבור (Microsoft 365) ומספר 12345.\nContact: Example 365 (12345)."),
      lines: Array.from({ length: scenario.lineCount ?? (long ? 24 : 1) }, (_, index) => ({
        id: `line-${index}`, productId: "microsoft-365", productName: scenario.productName ?? "Microsoft 365",
        licenseName: scenario.licenseName ?? (long ? `Business Basic ${index + 1} with a long license description for wrapping across several lines`
          : scenario.lineCount ? `Business Basic ${index + 1}` : "Business Basic"),
        billing: scenario.billings?.[index] ?? (index % 2 ? "annual-upfront" : "annual-monthly"),
        quantity: "2", unitPrice: scenario.unitPrice ?? "25", markupPercent, discountPercent,
      })),
    }, locale);
    return document.output("datauristring").split(",")[1];
  }, { locale, scenario });
  const pdf = Buffer.from(encoded, "base64");
  const path = testInfo.outputPath(`quotation-${locale}${scenario.long ? "-long" : ""}.pdf`);
  await writeFile(path, pdf);
  await testInfo.attach(`quotation-${locale}`, { path, contentType: "application/pdf" });
  return readPdfContent(pdf);
}

for (const locale of ["en", "he"] as const) {
  test(`exports ${locale} selling prices above 100% profit without exposing cost or rate`, async ({ page }, testInfo) => {
    const content = await renderQuote(page, testInfo, locale, { markupPercent: "150" });
    expectPaymentBreakdown(content, locale, [{ yearly: false, payment: "$125.00", cost: "$1,500.00" }], "$1,500.00");
    expectLicenseRows(content, locale, [false], "$62.50", "$125.00");
    const { text } = content;
    const values = text.map((item) => item.text);
    expect(values).toContain("$1,500.00");
    expect(values.join("\n")).not.toContain("$25.00");
    expect(values.join("\n")).not.toContain("$37.50");
    expect(values.join("\n")).not.toMatch(/150%|markup|profit rate|profit per license|base price|company earnings|שיעור רווח|חוור רועיש/i);
    expect(values).toContain("Microsoft 365");
    expect(values).toContain("Business Basic");
  });

  test(`exports ${locale} discounted customer prices without exposing cost or profit`, async ({ page }, testInfo) => {
    const content = await renderQuote(page, testInfo, locale, { markupPercent: "20", discountPercent: "10" });
    expectPaymentBreakdown(content, locale, [{ yearly: false, payment: "$54.00", cost: "$648.00" }], "$648.00");
    expectLicenseRows(content, locale, [false], "$27.00", "$54.00");
    const { text } = content;
    const values = text.map((item) => item.text);
    expect(values).toContain("$648.00");
    expect(values.join("\n")).not.toContain("$25.00");
    expect(values.join("\n")).not.toContain("$30.00");
    expect(values.join("\n")).not.toContain("$2.00");
    expect(values.join("\n")).not.toMatch(/20%|profit rate|base price|שיעור רווח|חוור רועיש/i);
  });

  test(`exports ${locale} customer prices and mixed-script details with a fixed left logo`, async ({ page }, testInfo) => {
    const content = await renderQuote(page, testInfo, locale);
    const header = expectCompactHeader(content, locale);
    expectPaymentBreakdown(content, locale, [{ yearly: false, payment: "$58.50", cost: "$702.00" }], "$702.00");
    expectLicenseRows(content, locale, [false], "$29.25", "$58.50");
    const { text } = content;
    const values = text.map((item) => item.text);
    expect(values).toContain("$702.00");
    expect(values.join("\n")).not.toContain("$25.00");
    expect(values.join("\n")).not.toContain("$4.25");
    expect(values.join("\n")).not.toMatch(/17%|markup|profit rate|profit per license|base price|company earnings/i);
    expect(values).toContain("Microsoft 365");
    expect(values).toContain("Business Basic");
    expect(values).toContain("Contact: Example 365 (12345).");
    expect(values.some((value) => value.includes("(Microsoft 365)") && value.includes("12345"))).toBe(true);
    const customer = text.find((item) => item.text === "ןהכ דוד");
    expect(customer).toBeDefined();
    if (locale === "en") {
      expect(customer?.x).toBeGreaterThan(header.company.x + header.company.width);
      expect(values).toContain("Company:");
      expect(values).not.toContain("QUOTE REFERENCE");
    } else {
      expect(customer?.x).toBeLessThan(header.company.x);
      expect(values).toContain(":הרבח");
      expect(values).not.toContain("QUOTATION");
      expect(values).not.toContain("Monthly payments");
      const license = text.find((item) => item.text === "Business Basic");
      const amount = text.find((item) => item.text.includes("$29.25"));
      expect(license?.x).toBeGreaterThan(amount?.x ?? Number.POSITIVE_INFINITY);
    }
  });
}

for (const locale of ["en", "he"] as const) {
  test(`fits eight short ${locale} licenses, the annual cost breakdown, and notes on one page`, async ({ page }, testInfo) => {
    const content = await renderQuote(page, testInfo, locale, {
      lineCount: 8, notes: "Please confirm this proposal.", markupPercent: "20", discountPercent: "10",
    });
    expectCompactHeader(content, locale);
    expectPaymentBreakdown(content, locale, [
      { yearly: false, payment: "$216.00", cost: "$2,592.00" }, { yearly: true, payment: "$216.00", cost: "$216.00" },
    ], "$2,808.00");
    expectLicenseRows(content, locale, Array.from({ length: 8 }, (_, index) => Boolean(index % 2)), "$27.00", "$54.00");
    expect(content.logos).toHaveLength(1);
    expect(new Set(content.text.map((item) => item.page))).toEqual(new Set([1]));
    const values = content.text.map((item) => item.text);
    for (let index = 1; index <= 8; index += 1) expect(values).toContain(`Business Basic ${index}`);
    expect(values).toContain("$2,592.00");
    expect(values).not.toContain("$432.00");
    expect(values).toContain("$2,808.00");
    const note = content.text.find((item) => item.text === "Please confirm this proposal.");
    const lastLicense = content.text.find((item) => item.text === "Business Basic 8");
    expect(note).toBeDefined();
    expect(lastLicense).toBeDefined();
    expect(note?.y).toBeLessThan(lastLicense?.y ?? 0);
    expect(note?.y).toBeGreaterThan((297 - 273) * 72 / 25.4);
  });

  test(`wraps long ${locale} customer, reference, product, and license text without overlap`, async ({ page }, testInfo) => {
    const customer = `${"Northwind Enterprise Services ".repeat(6)}Customer End`;
    const reference = `PROPOSAL-${"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".repeat(2)}`.slice(0, 64);
    const productName = "Northwind Productivity and Security Suite ".repeat(4).trim();
    const licenseName = "Business Basic with advanced management and enterprise services ".repeat(3).trim();
    const content = await renderQuote(page, testInfo, locale, { customer, reference, productName, licenseName, notes: "Final note 98765." });
    const { company, customers, references, table } = expectCompactHeader(content, locale, reference);
    expect(customers.length).toBeGreaterThan(1);
    expect(references.length).toBeGreaterThan(1);
    expect(customers.map((item) => item.text).join(" ")).toBe(customer);
    expect(table.y).toBeLessThan(Math.min(...[...customers, ...references].map((item) => item.y)));
    const breakdown = content.text.find((item) => item.text === (locale === "en" ? "Payment calculation" : "םימולשתה בושיח"));
    if (!breakdown) throw new Error("The complete license row must precede its payment breakdown");
    const nameCell = content.text.filter((item) => item.page === table.page && item.y < table.y && item.y > breakdown.y && inColumn(item, locale, 22, 54));
    const products = nameCell.filter((item) => item.font === table.font);
    const licenses = nameCell.filter((item) => item.font === company.font);
    expect(products.length).toBeGreaterThan(1);
    expect(licenses.length).toBeGreaterThan(1);
    expect(products.map((item) => item.text).join(" ")).toBe(productName);
    expect(licenses.map((item) => item.text).join(" ")).toBe(licenseName);
    expect(Math.min(...products.map((item) => item.y))).toBeGreaterThan(Math.max(...licenses.map((item) => item.y)));
    expect(content.text.map((item) => item.text)).toContain("Final note 98765.");
  });

  test(`paginates ${locale} license details and notes with repeated left logos and localized headers and footers`, async ({ page }, testInfo) => {
    const content = await renderQuote(page, testInfo, locale, { long: true });
    expectCompactHeader(content, locale);
    expectPaymentBreakdown(content, locale, [
      { yearly: false, payment: "$702.00", cost: "$8,424.00" }, { yearly: true, payment: "$702.00", cost: "$702.00" },
    ], "$9,126.00");
    expectLicenseRows(content, locale, Array.from({ length: 24 }, (_, index) => Boolean(index % 2)), "$29.25", "$58.50");
    const { text } = content;
    const pageCount = Math.max(...text.map((item) => item.page));
    expect(pageCount).toBeGreaterThan(2);
    const values = text.map((item) => item.text);
    expect(values).not.toContain("$1,404.00");
    for (let index = 1; index <= 24; index += 1) {
      expect(values.join(" ")).toContain(`Business Basic ${index} with a long license description for wrapping across several lines`);
    }
    expect(values).toContain("End of notes 98765.");
    const detailsPages = new Set(text.filter((item) => item.text.includes("Business Basic")).map((item) => item.page));
    expect(detailsPages.size).toBeGreaterThan(1);
    for (const page of detailsPages) {
      const contents = text.filter((item) => item.page === page).map((item) => item.text);
      expect(contents).toContain(locale === "he" ? "ןוישיר / רצומ" : "PRODUCT / LICENSE");
      expect(contents).toContain(locale === "he" ? "בויח לולסמ" : "BILLING");
    }
    for (let page = 1; page <= pageCount; page += 1) {
      const contents = text.filter((item) => item.page === page);
      if (page > 1) {
        expect(contents.filter((item) => item.text === "SEAT-2026-001")).toHaveLength(1);
        expect(contents.map((item) => item.text)).not.toContain(locale === "en" ? "SALES PROPOSAL" : "הריכמ תעצה");
        expect(contents.map((item) => item.text)).not.toContain(locale === "en" ? "ISSUED" : "הקפה ךיראת");
      }
      expect(contents.some((item) => item.text === (locale === "he" ? `${pageCount} ךותמ ${page} דומע` : `Page ${page} of ${pageCount}`))).toBe(true);
      expect(contents.every((item) => item.x >= 18 * 72 / 25.4 - 0.1 && item.x < 192 * 72 / 25.4)).toBe(true);
    }
  });
}

for (const locale of ["en", "he"] as const) {
  const cases: { name: string; billings: NonNullable<QuoteScenario["billings"]>; price: string; discount: string; groups: PaymentGroup[]; total: string; unit: string; amount: string }[] = [
    { name: "monthly schedules only", billings: ["monthly", "annual-monthly"], price: "25", discount: "10",
      groups: [{ yearly: false, payment: "$108.00", cost: "$1,296.00" }], total: "$1,296.00", unit: "$27.00", amount: "$54.00" },
    { name: "yearly billing only", billings: ["annual-upfront", "annual-upfront"], price: "25", discount: "10",
      groups: [{ yearly: true, payment: "$108.00", cost: "$108.00" }], total: "$108.00", unit: "$27.00", amount: "$54.00" },
    { name: "both zero-priced billing groups", billings: ["monthly", "annual-upfront"], price: "0", discount: "0",
      groups: [{ yearly: false, payment: "$0.00", cost: "$0.00" }, { yearly: true, payment: "$0.00", cost: "$0.00" }],
      total: "$0.00", unit: "$0.00", amount: "$0.00" },
    { name: "a fully discounted yearly group", billings: ["annual-upfront"], price: "25", discount: "100",
      groups: [{ yearly: true, payment: "$0.00", cost: "$0.00" }], total: "$0.00", unit: "$0.00", amount: "$0.00" },
  ];
  for (const sample of cases) {
    test(`exports ${locale} ${sample.name} without inventing or omitting billing categories`, async ({ page }, testInfo) => {
      const content = await renderQuote(page, testInfo, locale, {
        lineCount: sample.billings.length, billings: sample.billings, unitPrice: sample.price,
        markupPercent: "20", discountPercent: sample.discount,
      });
      expectCompactHeader(content, locale);
      expectPaymentBreakdown(content, locale, sample.groups, sample.total);
      expectLicenseRows(content, locale, sample.billings.map((billing) => billing === "annual-upfront"), sample.unit, sample.amount);
    });
  }
}
