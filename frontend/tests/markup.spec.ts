import { calculateLine, calculateQuote, parseMarkupBasisPoints } from "../src/features/quotes/calculations";
import type { QuoteLine } from "../src/features/quotes/types";

import { expect, test } from "./fixtures";

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
    { unitPrice: "0", markupPercent: "100", expected: 0 },
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
  for (const value of ["", "-1", "100.01", "101", "1.234", "1e1", "Infinity"]) {
    expect(parseMarkupBasisPoints(value), value).toBeNull();
    expect(calculateLine({ ...baseLine, markupPercent: value }).valid, value).toBe(false);
  }
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
  for (const value of ["", "-1", "101", "100.01", "1.234", "1e1"]) {
    await markup.fill(value);
    await expect(markup).toHaveAttribute("aria-invalid", "true");
    await expect(exportButton, value).toBeDisabled();
    await expect(line.getByText("Enter a profit rate from 0 to 100% with up to two decimal places.", { exact: true })).toBeVisible();
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
