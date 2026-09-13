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

// Decode the actual embedded Unicode glyphs and page coordinates with Node's built-in
// zlib. This keeps PDF assertions portable without a system PDF reader or test dependency.
function readPdfText(pdf: Buffer): PdfText[] {
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
  let page = 0;
  for (const object of objects.values()) {
    if (!/\/Type \/Page\b/.test(object)) continue;
    page += 1;
    const contentId = Number(object.match(/\/Contents (\d+) 0 R/)?.[1]);
    for (const block of stream(contentId).matchAll(/BT\s*([\s\S]*?)\s*ET/g)) {
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
  return texts;
}

async function renderQuote(page: Page, testInfo: TestInfo, locale: "en" | "he", long = false, markupPercent = "17"): Promise<PdfText[]> {
  await page.goto("/");
  const encoded = await page.evaluate(async ({ locale, long, markupPercent }) => {
    const modulePath = "/src/features/quotes/exportPdf.ts";
    const { buildQuotePdf } = await import(modulePath) as {
      buildQuotePdf: (draft: object, locale: "en" | "he") => Promise<{ output: (format: "datauristring") => string }>;
    };
    const document = await buildQuotePdf({
      version: 1, reference: "SEAT-2026-001", date: "2026-09-11",
      customer: "דוד כהן", notes: long ? "הערות עבור Microsoft 365 ומספר 12345. ".repeat(70) : "שירות עבור (Microsoft 365) ומספר 12345.\nContact: Example 365 (12345).",
      lines: Array.from({ length: long ? 24 : 1 }, (_, index) => ({
        id: `line-${index}`, productId: "microsoft-365", productName: "Microsoft 365",
        licenseName: long ? `Business Basic ${index + 1} with a long license description for wrapping across several lines` : "Business Basic",
        billing: index % 2 ? "annual-upfront" : "annual-monthly", quantity: "2", unitPrice: "25", markupPercent,
      })),
    }, locale);
    return document.output("datauristring").split(",")[1];
  }, { locale, long, markupPercent });
  const pdf = Buffer.from(encoded, "base64");
  const path = testInfo.outputPath(`quotation-${locale}${long ? "-long" : ""}.pdf`);
  await writeFile(path, pdf);
  await testInfo.attach(`quotation-${locale}`, { path, contentType: "application/pdf" });
  return readPdfText(pdf);
}

for (const locale of ["en", "he"] as const) {
  test(`exports ${locale} selling prices above 100% profit without exposing cost or rate`, async ({ page }, testInfo) => {
    const text = await renderQuote(page, testInfo, locale, false, "150");
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

  test(`exports ${locale} customer prices, mixed-script text, and aligned customer details`, async ({ page }, testInfo) => {
    const text = await renderQuote(page, testInfo, locale);
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
      expect(values).toContain("QUOTATION");
    } else {
      expect(customer?.x).toBeGreaterThan(150 * 72 / 25.4);
      expect(values).toContain("דובכל");
      expect(values).toContain("הריכמ תעצה");
      expect(values).toContain("ריחמ תעצה");
      expect(values).not.toContain("QUOTATION");
      expect(values).not.toContain("Monthly payments");
      const license = text.find((item) => item.text === "Business Basic");
      const amount = text.find((item) => item.text === "$29.25");
      expect(license?.x).toBeGreaterThan(amount?.x ?? Number.POSITIVE_INFINITY);
    }
  });
}

test("paginates Hebrew license details and mixed-script notes with translated repeated headers and footers", async ({ page }, testInfo) => {
  const text = await renderQuote(page, testInfo, "he", true);
  const pageCount = Math.max(...text.map((item) => item.page));
  expect(pageCount).toBeGreaterThan(2);
  const detailsPages = new Set(text.filter((item) => item.text.includes("Business Basic")).map((item) => item.page));
  expect(detailsPages.size).toBeGreaterThan(1);
  for (const page of detailsPages) {
    const contents = text.filter((item) => item.page === page).map((item) => item.text);
    expect(contents).toContain("ןוישיר / רצומ");
    expect(contents).toContain("בויח לולסמ");
  }
  for (let page = 1; page <= pageCount; page += 1) {
    const contents = text.filter((item) => item.page === page);
    expect(contents.some((item) => item.text === `${pageCount} ךותמ ${page} דומע`)).toBe(true);
    expect(contents.every((item) => item.x >= 18 * 72 / 25.4 - 0.1 && item.x < 192 * 72 / 25.4)).toBe(true);
  }
});
