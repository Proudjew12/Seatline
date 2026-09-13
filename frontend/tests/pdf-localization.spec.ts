import { writeFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";

import type { Page, TestInfo } from "@playwright/test";

import { expect, test } from "./fixtures";

interface PdfText {
  text: string;
  x: number;
  y: number;
  page: number;
}

interface PdfLogo {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

interface PdfContent {
  text: PdfText[];
  logos: PdfLogo[];
}

// Decode the actual embedded Unicode glyphs and page coordinates with Node's built-in
// zlib. This keeps PDF assertions portable without a system PDF reader or test dependency.
function readPdfContent(pdf: Buffer): PdfContent {
  const objects = new Map<number, string>();
  for (const match of pdf.toString("latin1").matchAll(/(\d+) 0 obj\s*([\s\S]*?)\s*endobj/g)) {
    objects.set(Number(match[1]), match[2]);
  }
  const stream = (id: number): string => {
    const object = objects.get(id) ?? "";
    const start = object.indexOf("stream\n") + 7;
    const length = Number(object.match(/\/Length\s+(\d+)/)?.[1]);
    expect(start).toBeGreaterThan(6);
    expect(length).toBeGreaterThan(0);
    const data = Buffer.from(object.slice(start, start + length), "latin1");
    return (/\/FlateDecode/.test(object) ? inflateSync(data) : data).toString("latin1");
  };
  const fonts = new Map<string, Map<string, string>>();
  for (const object of objects.values()) {
    for (const font of object.matchAll(/\/(F\d+) (\d+) 0 R/g)) {
      const unicodeId = objects.get(Number(font[2]))?.match(/\/ToUnicode (\d+) 0 R/)?.[1];
      if (!unicodeId) continue;
      const glyphs = new Map<string, string>();
      for (const block of stream(Number(unicodeId)).matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
        for (const pair of block[1].matchAll(/<([\da-f]+)>\s*<([\da-f]+)>/gi)) {
          const unicode = pair[2].match(/.{4}/g) ?? [];
          glyphs.set(pair[1].toLowerCase(), unicode.map((code) => String.fromCharCode(Number.parseInt(code, 16))).join(""));
        }
      }
      fonts.set(font[1], glyphs);
    }
  }
  const texts: PdfText[] = [];
  const logos: PdfLogo[] = [];
  let page = 0;
  for (const object of objects.values()) {
    if (!/\/Type \/Page\b/.test(object)) continue;
    page += 1;
    const contentId = Number(object.match(/\/Contents (\d+) 0 R/)?.[1]);
    const content = stream(contentId);
    for (const image of content.matchAll(/([\d.-]+) 0 0 ([\d.-]+) ([\d.-]+) ([\d.-]+) cm\s*\/I\d+ Do/g)) {
      logos.push({ width: Number(image[1]), height: Number(image[2]), x: Number(image[3]), y: Number(image[4]), page });
    }
    for (const block of content.matchAll(/BT\s*([\s\S]*?)\s*ET/g)) {
      const font = block[1].match(/\/(F\d+) [\d.]+ Tf/)?.[1] ?? "";
      const position = block[1].match(/([\d.-]+) ([\d.-]+) Td/);
      const encoded = block[1].match(/<([\da-f]+)> Tj/i)?.[1];
      if (!encoded || !position) continue;
      const text = (encoded.match(/.{4}/g) ?? []).map((glyph) => fonts.get(font)?.get(glyph.toLowerCase()) ?? "�").join("");
      texts.push({ text, x: Number(position[1]), y: Number(position[2]), page });
    }
  }
  expect(texts.length).toBeGreaterThan(20);
  expect(texts.map((item) => item.text).join("\n")).not.toContain("�");
  return { text: texts, logos };
}

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
    expect(headerText.length).toBeGreaterThanOrEqual(page === 1 ? 2 : 1);
    for (const item of headerText) {
      expect(item.x, `Header "${item.text}" stays clear of the left logo`).toBeGreaterThan(logo.x + logo.width);
    }
  }
}

function expectCompactCaptions(text: PdfText[]): void {
  const values = text.map((item) => item.text);
  for (const caption of [
    "QUOTATION", "Software licenses", "SOFTWARE LICENSE QUOTATION", "All amounts in USD", "PAYMENT SUMMARY",
    "ריחמ תעצה", "הנכות תונוישיר", "הנכות תונוישירל ריחמ תעצה", "ב״הרא רלודב םימוכסה לכ", "םימולשת םוכיס",
  ]) expect(values).not.toContain(caption);
  expect(values.join(" ")).not.toMatch(/Prices are in USD|exclude taxes|Annual subscriptions carry|Amount due at start includes|estimate assumes|םיסמ|תובייחתה|ןושארה|וכשמיי/);
}

function expectCompactHeader(content: PdfContent, locale: "en" | "he", reference = "SEAT-2026-001"): void {
  expectLeftLogos(content);
  expectCompactCaptions(content.text);
  const page = content.text.filter((item) => item.page === 1);
  const proposal = page.find((item) => item.text === (locale === "en" ? "SALES PROPOSAL" : "הריכמ תעצה"));
  const issued = page.find((item) => item.text === (locale === "en" ? "ISSUED" : "הקפה ךיראת"));
  const customer = page.find((item) => item.text === (locale === "en" ? "PREPARED FOR" : "דובכל"));
  const date = page.find((item) => item.text.includes(locale === "en" ? "September" : "רבמטפס"));
  const logo = content.logos[0];
  expect(proposal).toBeDefined();
  expect(issued).toBeDefined();
  expect(customer).toBeDefined();
  expect(date).toBeDefined();
  if (!proposal || !issued || !customer || !date || !logo) throw new Error("Complete header metadata is required");
  const references = page.filter((item) => item.y < proposal.y && item.y > issued.y);
  expect(references.map((item) => item.text).join("")).toBe(reference);
  for (const item of [proposal, ...references, issued, date]) {
    expect(item.x, `${item.text} belongs in the physical right header`).toBeGreaterThanOrEqual(102 * 72 / 25.4 - 0.1);
    expect(item.x).toBeGreaterThan(logo.x + logo.width);
  }
  expect(date.text).toContain("2026");
  expect(date.text).toContain("11");
  expect(issued.y).toBeLessThan(proposal.y);
  expect(date.y).toBeLessThan(issued.y);
  expect(customer.y).toBeLessThan(Math.min(date.y, logo.y));
}

interface QuoteScenario {
  long?: boolean;
  lineCount?: number;
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
        id: `line-${index}`, productId: "microsoft-365", productName: "Microsoft 365",
        licenseName: long ? `Business Basic ${index + 1} with a long license description for wrapping across several lines`
          : scenario.lineCount ? `Business Basic ${index + 1}` : "Business Basic",
        billing: index % 2 ? "annual-upfront" : "annual-monthly", quantity: "2", unitPrice: "25", markupPercent, discountPercent,
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
    const { text } = await renderQuote(page, testInfo, locale, { markupPercent: "150" });
    const values = text.map((item) => item.text);
    expect(values).toContain("$62.50");
    expect(values).toContain("$125.00");
    expect(values).toContain("$1,500.00");
    expect(values).not.toContain("$25.00");
    expect(values).not.toContain("$37.50");
    expect(values.join("\n")).not.toMatch(/150%|markup|profit rate|profit per license|base price|company earnings|שיעור רווח|חוור רועיש/i);
    expect(values).toContain("Microsoft 365");
    expect(values).toContain("Business Basic");
  });

  test(`exports ${locale} discounted customer prices without exposing cost or profit`, async ({ page }, testInfo) => {
    const { text } = await renderQuote(page, testInfo, locale, { markupPercent: "20", discountPercent: "10" });
    const values = text.map((item) => item.text);
    expect(values).toContain("$27.00");
    expect(values).toContain("$54.00");
    expect(values).toContain("$648.00");
    expect(values).not.toContain("$25.00");
    expect(values).not.toContain("$30.00");
    expect(values).not.toContain("$2.00");
    expect(values.join("\n")).not.toMatch(/20%|profit rate|base price|שיעור רווח|חוור רועיש/i);
  });

  test(`exports ${locale} customer prices and mixed-script details with a fixed left logo`, async ({ page }, testInfo) => {
    const content = await renderQuote(page, testInfo, locale);
    expectCompactHeader(content, locale);
    const { text } = content;
    const values = text.map((item) => item.text);
    expect(values).toContain("$29.25");
    expect(values).toContain("$58.50");
    expect(values).toContain("$702.00");
    expect(values).not.toContain("$25.00");
    expect(values).not.toContain("$4.25");
    expect(values.join("\n")).not.toMatch(/17%|markup|profit rate|profit per license|base price|company earnings/i);
    expect(values).toContain("Microsoft 365");
    expect(values).toContain("Business Basic");
    expect(values).toContain("Contact: Example 365 (12345).");
    expect(values.some((value) => value.includes("(Microsoft 365)") && value.includes("12345"))).toBe(true);
    const customer = text.find((item) => item.text === "ןהכ דוד");
    expect(customer).toBeDefined();
    if (locale === "en") {
      expect(customer?.x).toBeCloseTo(18 * 72 / 25.4, 3);
      expect(values).toContain("PREPARED FOR");
      expect(values).toContain("SALES PROPOSAL");
      expect(values).not.toContain("QUOTE REFERENCE");
    } else {
      expect(customer?.x).toBeGreaterThan(150 * 72 / 25.4);
      expect(values).toContain("דובכל");
      expect(values).toContain("הריכמ תעצה");
      expect(values).not.toContain("QUOTATION");
      expect(values).not.toContain("Monthly payments");
      const license = text.find((item) => item.text === "Business Basic");
      const amount = text.find((item) => item.text === "$29.25");
      expect(license?.x).toBeGreaterThan(amount?.x ?? Number.POSITIVE_INFINITY);
    }
  });
}

for (const locale of ["en", "he"] as const) {
  test(`fits eight short ${locale} licenses, all four customer totals, and notes on one page`, async ({ page }, testInfo) => {
    const content = await renderQuote(page, testInfo, locale, {
      lineCount: 8, notes: "Please confirm this proposal.", markupPercent: "20", discountPercent: "10",
    });
    expectCompactHeader(content, locale);
    expect(content.logos).toHaveLength(1);
    expect(new Set(content.text.map((item) => item.page))).toEqual(new Set([1]));
    const values = content.text.map((item) => item.text);
    for (let index = 1; index <= 8; index += 1) expect(values).toContain(`Business Basic ${index}`);
    expect(values.filter((value) => value === "$27.00")).toHaveLength(8);
    expect(values.filter((value) => value === "$54.00")).toHaveLength(8);
    expect(values.filter((value) => value === "$216.00")).toHaveLength(2);
    expect(values).toContain("$432.00");
    expect(values).toContain("$2,808.00");
    const note = content.text.find((item) => item.text === "Please confirm this proposal.");
    const lastLicense = content.text.find((item) => item.text === "Business Basic 8");
    expect(note).toBeDefined();
    expect(lastLicense).toBeDefined();
    expect(note?.y).toBeLessThan(lastLicense?.y ?? 0);
    expect(note?.y).toBeGreaterThan((297 - 273) * 72 / 25.4);
  });

  test(`wraps a long ${locale} customer and proposal reference without losing header or license details`, async ({ page }, testInfo) => {
    const customer = `${"Northwind Enterprise Services ".repeat(6)}Customer End`;
    const reference = `PROPOSAL-${"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".repeat(2)}`.slice(0, 64);
    const content = await renderQuote(page, testInfo, locale, { customer, reference, notes: "Final note 98765." });
    expectCompactHeader(content, locale, reference);
    const prepared = content.text.find((item) => item.text === (locale === "en" ? "PREPARED FOR" : "דובכל"));
    const details = content.text.find((item) => item.text === (locale === "en" ? "LICENSE DETAILS" : "תונוישיר טוריפ"));
    if (!prepared || !details) throw new Error("Customer and license sections must be present");
    const customers = content.text.filter((item) => item.page === 1 && item.y < prepared.y && item.y > details.y);
    expect(customers.length).toBeGreaterThan(1);
    expect(customers.map((item) => item.text).join(" ")).toBe(customer);
    expect(details.y).toBeLessThan(Math.min(...customers.map((item) => item.y)));
    expect(content.text.map((item) => item.text)).toContain("Business Basic");
    expect(content.text.map((item) => item.text)).toContain("Final note 98765.");
  });

  test(`paginates ${locale} license details and notes with repeated left logos and localized headers and footers`, async ({ page }, testInfo) => {
    const content = await renderQuote(page, testInfo, locale, { long: true });
    expectCompactHeader(content, locale);
    const { text } = content;
    const pageCount = Math.max(...text.map((item) => item.page));
    expect(pageCount).toBeGreaterThan(2);
    const values = text.map((item) => item.text);
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
