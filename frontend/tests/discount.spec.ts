import { readFile } from "node:fs/promises";

import { calculateLine, calculateQuote, parseDiscountBasisPoints } from "../src/features/quotes/calculations";
import { isQuoteDraft } from "../src/features/quotes/storage";
import type { QuoteDraft, QuoteLine } from "../src/features/quotes/types";

import { closeSettings, expect, openSettings, test } from "./fixtures";

const baseLine: QuoteLine = {
  id: "discount-line", productId: "microsoft-365", productName: "Microsoft 365",
  licenseName: "Business Basic", billing: "annual-monthly", quantity: "1", unitPrice: "25", markupPercent: "20",
};
const oldDraft: QuoteDraft = {
  version: 1, sequence: 1, reference: "DISCOUNT-001", customer: "Discount customer",
  notes: "", date: "2026-09-13", lines: [baseLine],
};

test("discounts the selling price after profit, rounds units before quantity, and reports net earnings", () => {
  expect(calculateLine({ ...baseLine, discountPercent: "10", quantity: "3" })).toEqual({
    valid: true, baseUnitCents: 2500, customerUnitCents: 2700, markupUnitCents: 200,
    baseSubtotalCents: 7500, markupSubtotalCents: 600, subtotalCents: 8100,
  });
  for (const input of [
    { discountPercent: "0", expected: 3000 },
    { discountPercent: "100", expected: 0 },
    { discountPercent: "12.34", expected: 2630 },
    { discountPercent: "50", expected: 1500 },
    { discountPercent: "10", markupPercent: "150", expected: 5625 },
    { discountPercent: "10", markupPercent: "250.25", expected: 7880 },
    { discountPercent: "10", unitPrice: "0.05", markupPercent: "0", expected: 5 },
    { discountPercent: "10", unitPrice: "0.03", markupPercent: "17", expected: 4 },
    { discountPercent: "100", unitPrice: "0", expected: 0 },
    { discountPercent: "12.34", unitPrice: "1000000", markupPercent: "1000000", expected: 876_687_660_000 },
  ]) {
    const result = calculateLine({ ...baseLine, ...input, quantity: "3" });
    expect(result.valid, JSON.stringify(input)).toBe(true);
    expect(result.customerUnitCents).toBe(input.expected);
    expect(result.subtotalCents).toBe(input.expected * 3);
    expect(result.markupUnitCents).toBe(result.customerUnitCents - result.baseUnitCents);
  }
  expect(calculateLine(baseLine)).toEqual(calculateLine({ ...baseLine, discountPercent: "0" }));
  expect(calculateQuote([
    { ...baseLine, discountPercent: "10", quantity: "3" },
    { ...baseLine, id: "yearly", billing: "annual-upfront", discountPercent: "25", quantity: "2" },
  ])).toEqual({ valid: true, monthlyCents: 8100, annualUpfrontCents: 4500, dueNowCents: 12600, yearEstimateCents: 101700 });
});

test("validates discount bounds and rejects malformed stored discounts without repricing old drafts", () => {
  for (const [value, expected] of [["0", 0], [".5", 50], ["12.34", 1234], ["100.00", 10000]] as const) {
    expect(parseDiscountBasisPoints(value)).toBe(expected);
  }
  for (const value of ["", "-1", "100.01", "101", "1.234", "1e1", "Infinity", "NaN", " "]) {
    expect(parseDiscountBasisPoints(value), value).toBeNull();
    const line = { ...baseLine, discountPercent: value };
    expect(calculateLine(line).valid).toBe(false);
    expect(calculateQuote([line]).valid).toBe(false);
  }
  expect(isQuoteDraft(oldDraft)).toBe(true);
  for (const value of [null, 10, {}, [], "1".repeat(33)]) {
    expect(isQuoteDraft({ ...oldDraft, lines: [{ ...baseLine, discountPercent: value }] })).toBe(false);
  }
});

test("edits discounts separately per line, preserves them across reload and billing changes, and exports", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("Discount customer");
  await page.getByLabel("Sales Proposal", { exact: true }).fill("DISCOUNT-001");
  for (let index = 0; index < 2; index += 1) {
    await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  }
  const first = page.getByTestId("quote-line").first();
  const second = page.getByTestId("quote-line").last();
  await expect(first.getByLabel("Discount", { exact: true })).toHaveValue("0");
  await first.getByLabel("Price", { exact: true }).fill("25");
  await first.getByLabel("Profit rate", { exact: true }).fill("20");
  await first.getByLabel("Quantity", { exact: true }).fill("3");
  await first.getByLabel("Discount", { exact: true }).fill("10");
  await second.getByLabel("Price", { exact: true }).fill("10");
  await expect(second.getByLabel("Discount", { exact: true })).toHaveValue("0");
  await expect(first.getByLabel("Business Basic profit per license", { exact: true })).toHaveText("$2.00");
  await expect(first.getByLabel("Internal price calculation", { exact: true })).toContainText("$27.00 − $25.00 =");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$91.00");
  await page.reload();
  await expect(first.getByLabel("Discount", { exact: true })).toHaveValue("10");
  await expect(second.getByLabel("Discount", { exact: true })).toHaveValue("0");
  await first.getByRole("combobox", { name: "Billing Option", exact: true }).selectOption("annual-upfront");
  await expect(first.getByLabel("Price", { exact: true })).toHaveValue("");
  await expect(first.getByLabel("Discount", { exact: true })).toHaveValue("10");
  await first.getByLabel("Price", { exact: true }).fill("25");
  await expect(page.getByLabel("Yearly payments", { exact: true })).toHaveText("$81.00");
  await expect(page.getByLabel("12-month estimate", { exact: true })).toHaveText("$201.00");
  await first.getByLabel("Profit rate", { exact: true }).fill("150");
  await expect(first.getByLabel("Business Basic line total", { exact: true })).toHaveText("$168.75");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const download = await downloadPromise;
  const path = testInfo.outputPath("discounted-quote.pdf");
  await download.saveAs(path);
  expect((await readFile(path)).subarray(0, 5).toString()).toBe("%PDF-");
  expect(await download.failure()).toBeNull();
});

test("keeps old draft prices, blocks invalid discounts, and displays losses and free customer prices", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((draft) => localStorage.setItem("seatline.quote.v1", JSON.stringify(draft)), oldDraft);
  await page.reload();
  const line = page.getByTestId("quote-line");
  const discount = line.getByLabel("Discount", { exact: true });
  const exportButton = page.getByRole("button", { name: "Export PDF", exact: true });
  await expect(discount).toHaveValue("0");
  await expect(line.getByLabel("Business Basic line total", { exact: true })).toHaveText("$30.00");
  for (const value of ["", "-1", "100.01", "12.345", "1e2"]) {
    await discount.fill(value);
    await expect(discount).toBeFocused();
    await expect(discount).toHaveAttribute("aria-invalid", "true");
    await expect(line.getByText("Enter a discount from 0 to 100% with up to two decimal places.", { exact: true })).toBeVisible();
    await expect(exportButton).toBeDisabled();
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("—");
  }
  await discount.fill("50");
  await expect(line.getByLabel("Business Basic profit per license", { exact: true })).toHaveText("−$10.00");
  await expect(line.getByLabel("Business Basic line total", { exact: true })).toHaveText("$15.00");
  await discount.fill("100.00");
  await expect(line.getByLabel("Business Basic profit per license", { exact: true })).toHaveText("−$25.00");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$0.00");
  await expect(exportButton).toBeEnabled();
  await discount.press("Tab");
  await expect(discount).not.toBeFocused();
  await page.reload();
  await expect(discount).toHaveValue("100.00");
  await discount.fill("0");
  await expect(line.getByLabel("Internal price calculation", { exact: true })).toContainText("$25.00 × 20% =");
  await expect(exportButton).toBeEnabled();
});

test("keeps five compact cards with centered discount controls and supports Hebrew at 320px and 150%", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1867, height: 1000 });
  await page.goto("/");
  await page.evaluate((draft) => localStorage.setItem("seatline.quote.v1", JSON.stringify({
    ...draft, lines: Array.from({ length: 5 }, (_, index) => ({ ...draft.lines[0], id: `discount-${index}`, discountPercent: "10" })),
  })), oldDraft);
  await page.reload();
  const cards = page.getByTestId("quote-line");
  const first = cards.first();
  const rows = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().y));
  expect(rows).toHaveLength(5);
  expect(Math.max(...rows) - Math.min(...rows)).toBeLessThan(1);
  const amountRows = await first.locator("input").evaluateAll((elements) => elements.slice(1).map((element) => element.getBoundingClientRect().y));
  expect(amountRows).toHaveLength(3);
  expect(Math.max(...amountRows) - Math.min(...amountRows)).toBeLessThan(1);
  await page.screenshot({ path: testInfo.outputPath("discount-five-cards.png") });
  for (const locale of ["en", "he"]) {
    if (locale === "he") {
      await openSettings(page);
      await page.getByRole("combobox", { name: "Text size", exact: true }).selectOption("150");
      await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
      await closeSettings(page);
      await page.setViewportSize({ width: 320, height: 740 });
    }
    const discount = first.getByLabel(locale === "en" ? "Discount" : "הנחה", { exact: true });
    await discount.fill("100.00");
    await discount.press("Tab");
    await page.evaluate(() => document.fonts.ready);
    const geometry = await first.evaluate((element) => {
      const card = element.getBoundingClientRect();
      return Array.from(element.querySelectorAll("label")).map((label) => {
        const input = label.querySelector("input, select");
        const title = label.querySelector(":scope > span");
        if (!input || !title) throw new Error("A field needs its control and label");
        const bounds = input.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(title);
        const caption = range.getBoundingClientRect();
        return { contained: bounds.left >= card.left && bounds.right <= card.right,
          offset: Math.abs(caption.x + caption.width / 2 - bounds.x - bounds.width / 2) };
      });
    });
    expect(geometry).toHaveLength(5);
    for (const field of geometry) {
      expect(field.contained).toBe(true);
      expect(field.offset).toBeLessThanOrEqual(1);
    }
    await expect(discount).toHaveValue("100.00");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await first.screenshot({ path: testInfo.outputPath(`discount-${locale}-maximum.png`) });
    await first.getByLabel(locale === "en" ? "Price" : "מחיר", { exact: true }).fill("1000000");
    await first.getByLabel(locale === "en" ? "Profit rate" : "שיעור רווח", { exact: true }).fill("1000000");
    for (const rate of ["0.01", "100.00"]) {
      await discount.fill(rate);
      const calculation = first.getByRole("group", { name: locale === "en" ? "Internal price calculation" : "חישוב מחיר פנימי", exact: true });
      const formulaFits = await calculation.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const rectangles: DOMRect[] = [];
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          rectangles.push(...Array.from(range.getClientRects()));
        }
        return rectangles.length > 1 && rectangles.every((box) => box.left >= bounds.left && box.right <= bounds.right)
          && Math.max(...rectangles.map((box) => box.top)) < Math.min(...rectangles.map((box) => box.bottom));
      });
      expect(formulaFits, `${locale}: maximum prices and ${rate}% discount must stay on one contained line`).toBe(true);
      await first.screenshot({ path: testInfo.outputPath(`discount-${locale}-large-${rate}.png`) });
    }
    await discount.fill("101");
    await expect(discount).toHaveAttribute("aria-invalid", "true");
    if (locale === "he") await expect(first.getByText("יש להזין הנחה בין 0 ל־100%, עם עד שתי ספרות אחרי הנקודה.", { exact: true })).toBeVisible();
    await discount.fill("10");
    await first.getByLabel(locale === "en" ? "Price" : "מחיר", { exact: true }).fill("25");
    await first.getByLabel(locale === "en" ? "Profit rate" : "שיעור רווח", { exact: true }).fill("20");
  }
});
