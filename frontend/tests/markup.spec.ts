import { calculateLine, calculateQuote, parseMarkupBasisPoints } from "../src/features/quotes/calculations";
import type { QuoteLine } from "../src/features/quotes/types";

import { closeSettings, expect, openSettings, test } from "./fixtures";

const baseLine: QuoteLine = {
  id: "line-1", productId: "microsoft-365", productName: "Microsoft 365",
  licenseName: "Business Basic", billing: "annual-monthly", quantity: "1", unitPrice: "25",
};

test("calculates company markup per unit before quantity using exact cent rounding", () => {
  expect(calculateLine({ ...baseLine, quantity: "3", markupPercent: "17" })).toEqual({
    valid: true, baseUnitCents: 2500, customerUnitCents: 2925, markupUnitCents: 425,
    baseSubtotalCents: 7500, markupSubtotalCents: 1275, subtotalCents: 8775,
  });
  for (const input of [
    { unitPrice: "0.03", markupPercent: "17", expected: 4 },
    { unitPrice: "0.05", markupPercent: "10", expected: 6 },
    { unitPrice: "25", markupPercent: "17.25", expected: 2931 },
    { unitPrice: "25", markupPercent: "0", expected: 2500 },
    { unitPrice: "25", markupPercent: "100", expected: 5000 },
    { unitPrice: "25", markupPercent: "150", expected: 6250 },
    { unitPrice: "25", markupPercent: "200", expected: 7500 },
    { unitPrice: "25", markupPercent: "250.25", expected: 8756 },
    { unitPrice: "0", markupPercent: "100", expected: 0 },
    { unitPrice: "0", markupPercent: "1000000.00", expected: 0 },
  ]) {
    const result = calculateLine({ ...baseLine, ...input, quantity: "3" });
    expect(result.valid).toBe(true);
    expect(result.customerUnitCents).toBe(input.expected);
    expect(result.subtotalCents).toBe(input.expected * 3);
  }
  expect(calculateLine(baseLine).customerUnitCents).toBe(2500);
  const totals = calculateQuote([
    { ...baseLine, quantity: "3", markupPercent: "17" },
    { ...baseLine, id: "line-2", billing: "annual-upfront", quantity: "2", unitPrice: "120", markupPercent: "10" },
  ]);
  expect(totals).toEqual({
    valid: true, monthlyCents: 8775, annualUpfrontCents: 26400,
    dueNowCents: 35175, yearEstimateCents: 131700,
  });
  const maximum = calculateQuote(Array.from({ length: 100 }, (_, index) => ({
    ...baseLine, id: String(index), unitPrice: "1000000", quantity: "9999", markupPercent: "100",
  })));
  expect(maximum.valid).toBe(true);
  expect(maximum.yearEstimateCents).toBe(2_399_760_000_000_000);
  expect(Number.isSafeInteger(maximum.yearEstimateCents)).toBe(true);
  for (const [value, expected] of [["100.01", 10001], ["101", 10100], ["1000000.00", 100000000]] as const) {
    expect(parseMarkupBasisPoints(value), value).toBe(expected);
  }
  for (const value of ["", "-1", "1000000.01", "1000001", "1.234", "1e1", "Infinity"]) {
    expect(parseMarkupBasisPoints(value), value).toBeNull();
    expect(calculateLine({ ...baseLine, markupPercent: value }).valid, value).toBe(false);
  }
});

test("rounds large profit rates exactly and rejects unsafe line or aggregate totals", () => {
  // The multiplication exceeds safe Number precision even though the rounded result is safe.
  const rounded = calculateLine({
    ...baseLine, unitPrice: "999949.99", markupPercent: "999800.01", quantity: "3",
  });
  expect(rounded).toMatchObject({
    valid: true, customerUnitCents: 999_850_005_000, markupUnitCents: 999_750_010_001,
    subtotalCents: 2_999_550_015_000,
  });
  const maximumRate = { ...baseLine, unitPrice: "1000000", markupPercent: "1000000" };
  expect(calculateLine(maximumRate)).toMatchObject({ valid: true, customerUnitCents: 1_000_100_000_000 });
  expect(calculateLine({ ...maximumRate, quantity: "9999" }).valid).toBe(false);
  const annualLine: QuoteLine = { ...maximumRate, quantity: "5000", billing: "annual-upfront" };
  expect(calculateLine(annualLine).valid).toBe(true);
  expect(calculateQuote([annualLine]).valid).toBe(true);
  const invalidTotals = { valid: false, monthlyCents: 0, annualUpfrontCents: 0, dueNowCents: 0, yearEstimateCents: 0 };
  expect(calculateQuote([annualLine, { ...annualLine, id: "second" }])).toEqual(invalidTotals);
  expect(calculateQuote([{ ...maximumRate, quantity: "1000" }])).toEqual(invalidTotals);
});

test("shows profit per license separately from customer totals and persists each line's percentage", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("Markup customer");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  const markup = line.getByRole("textbox", { name: "Profit rate", exact: true });
  await expect(markup).toHaveValue("0");
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("25");
  await markup.fill("17");
  await expect(line.getByLabel("Internal price calculation", { exact: true })).toContainText("$25.00 × 17% =");
  await expect(line.getByLabel("Business Basic profit per license", { exact: true })).toHaveText("$4.25");
  await expect(line.getByLabel("Business Basic line total", { exact: true })).toHaveText("$29.25");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$29.25");
  await line.getByLabel("Quantity", { exact: true }).fill("3");
  await expect(line.getByLabel("Business Basic profit per license", { exact: true })).toHaveText("$4.25");
  await expect(line.getByLabel("Business Basic line total", { exact: true })).toHaveText("$87.75");
  await expect(page.getByLabel("12-month estimate", { exact: true })).toHaveText("$1,053.00");
  await page.getByRole("button", { name: "Add Business Standard to quote", exact: true }).press("Enter");
  const second = page.getByRole("group", { name: "Business Standard", exact: true });
  await expect(second.getByRole("textbox", { name: "Profit rate", exact: true })).toHaveValue("0");
  await second.getByRole("textbox", { name: "Price", exact: true }).fill("10");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$97.75");
  await page.reload();
  await expect(markup).toHaveValue("17");
  await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("25");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$97.75");
  await line.getByRole("combobox", { name: "Billing Option", exact: true }).selectOption("annual-upfront");
  await expect(markup).toHaveValue("17");
  await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("");
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("120");
  await expect(page.getByLabel("Yearly payments", { exact: true })).toHaveText("$421.20");
  await expect(page.getByLabel("Due at start", { exact: true })).toHaveText("$431.20");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("blocks invalid profit rates and supports zero, fractional percentages, and per-unit rounding", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("Rounding customer");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  const markup = line.getByRole("textbox", { name: "Profit rate", exact: true });
  const price = line.getByRole("textbox", { name: "Price", exact: true });
  const exportButton = page.getByRole("button", { name: "Export PDF", exact: true });
  await price.fill("25");
  for (const value of ["", "-1", "1000001", "1000000.01", "1.234", "1e1"]) {
    await markup.fill(value);
    await expect(markup).toHaveAttribute("aria-invalid", "true");
    await expect(exportButton, value).toBeDisabled();
    await expect(line.getByText("Enter a profit rate from 0 to 1,000,000% with up to two decimal places.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("—");
  }
  await markup.fill("17.25");
  await expect(exportButton).toBeEnabled();
  await expect(line.getByLabel("Business Basic profit per license", { exact: true })).toHaveText("$4.31");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$29.31");
  await price.fill("0.03");
  await markup.fill("17");
  await line.getByLabel("Quantity", { exact: true }).fill("3");
  await expect(line.getByLabel("Business Basic profit per license", { exact: true })).toHaveText("$0.01");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$0.12");
  await markup.fill("0");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$0.09");
  await price.fill("0");
  await markup.fill("100");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$0.00");
  await expect(exportButton).toBeEnabled();
});

test("accepts and persists profit above 100% while blocking unsafe quote totals", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("High profit customer");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  const markup = line.getByRole("textbox", { name: "Profit rate", exact: true });
  const price = line.getByRole("textbox", { name: "Price", exact: true });
  const quantity = line.getByLabel("Quantity", { exact: true });
  const exportButton = page.getByRole("button", { name: "Export PDF", exact: true });
  await price.fill("25");
  for (const [rate, profit, total] of [
    ["150", "$37.50", "$62.50"], ["200", "$50.00", "$75.00"], ["250.25", "$62.56", "$87.56"],
  ]) {
    await markup.fill(rate);
    await expect(line.getByLabel("Business Basic profit per license", { exact: true })).toHaveText(profit);
    await expect(line.getByLabel("Business Basic line total", { exact: true })).toHaveText(total);
    await expect(exportButton).toBeEnabled();
  }
  await quantity.fill("3");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$262.68");
  await page.reload();
  await expect(markup).toHaveValue("250.25");
  await expect(quantity).toHaveValue("3");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$262.68");
  await markup.fill("1000000.00");
  await expect(markup).toHaveValue("1000000.00");
  await price.fill("1000000");
  await quantity.fill("1000");
  await expect(exportButton).toBeDisabled();
  for (const name of ["Monthly payments", "Yearly payments", "Due at start", "12-month estimate"]) {
    await expect(page.getByLabel(name, { exact: true })).toHaveText("—");
  }
  await expect(page.getByText("The quote total is too large. Reduce the quantity, price, or profit rate.", { exact: true })).toBeVisible();
  await quantity.fill("1");
  await expect(exportButton).toBeEnabled();
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$10,001,000,000.00");
});

test("keeps percentage suffix clear of every digit at 320px and 150% in English and Hebrew", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => localStorage.setItem("seatline.display.v1", JSON.stringify({
    textSize: 150, theme: "light", locale: "en",
  })));
  await page.goto("/");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("25");
  for (const [locale, label] of [["en", "Profit rate"], ["he", "שיעור רווח"]]) {
    if (locale === "he") {
      await openSettings(page);
      await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
      await closeSettings(page);
    }
    await page.evaluate(() => document.fonts.ready);
    const input = line.getByRole("textbox", { name: label, exact: true });
    for (const rate of ["32", "250.25", "1000000.00"]) {
      await input.fill(rate);
      await input.press("Tab");
      await expect(input).toHaveValue(rate);
      await expect(input).toHaveAttribute("aria-invalid", "false");
      const geometry = await input.evaluate((element) => {
        if (!(element instanceof HTMLInputElement)) throw new Error("Profit rate must be an input");
        const suffix = element.closest("label")?.querySelector<HTMLElement>('[aria-hidden="true"]');
        if (!suffix || suffix.textContent !== "%") throw new Error("Profit rate must show its percentage suffix");
        const context = document.createElement("canvas").getContext("2d");
        if (!context) throw new Error("Text measurement requires a canvas context");
        const style = getComputedStyle(element);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const width = context.measureText(element.value).width;
        const bounds = element.getBoundingClientRect();
        const textStart = bounds.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
        const contentEnd = bounds.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
        return {
          textEnd: textStart + width, contentEnd, suffixStart: suffix.getBoundingClientRect().left,
          scrollLeft: element.scrollLeft,
          contained: document.documentElement.scrollWidth <= window.innerWidth,
        };
      });
      expect(geometry.textEnd, `${locale}: ${rate} digits must precede %`).toBeLessThanOrEqual(geometry.suffixStart);
      expect(geometry.textEnd, `${locale}: ${rate} must fit the input content area`).toBeLessThanOrEqual(geometry.contentEnd + 1);
      expect(geometry.scrollLeft, `${locale}: ${rate} must remain fully visible`).toBeLessThanOrEqual(1);
      expect(geometry.contained, `${locale}: ${rate} must not overflow the page`).toBe(true);
    }
  }
});

test("migrates legacy drafts without repricing or deleting their original browser storage", async ({ page }) => {
  const legacyDraft = {
    version: 1, sequence: 12, reference: "SP-0012", date: "2026-09-11",
    customer: "Existing customer", notes: "Keep this order", lines: [baseLine],
  };
  await page.addInitScript((draft) => localStorage.setItem("saleprice.quote.v1", JSON.stringify(draft)), legacyDraft);
  await page.goto("/");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  const markup = line.getByRole("textbox", { name: "Profit rate", exact: true });
  await expect(markup).toHaveValue("0");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$25.00");
  await expect(page.getByLabel("Sales Proposal", { exact: true })).toHaveValue("SP-0012");
  expect(await page.evaluate(() => localStorage.getItem("saleprice.quote.v1"))).toBe(JSON.stringify(legacyDraft));
  expect(await page.evaluate(() => localStorage.getItem("seatline.quote.v1"))).toBe(JSON.stringify(legacyDraft));
  await markup.fill("17");
  await page.reload();
  await expect(markup).toHaveValue("17");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$29.25");
  expect(await page.evaluate(() => localStorage.getItem("saleprice.quote.v1"))).toBe(JSON.stringify(legacyDraft));
  await expect(page.getByRole("alert")).toHaveCount(0);
});
