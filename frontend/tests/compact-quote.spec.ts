import type { Locator, Page } from "@playwright/test";

import { closeSettings, expect, openSettings, setTextSize, test } from "./fixtures";

async function addPricedLine(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByTestId("quote-line").last();
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("22");
  await line.getByRole("textbox", { name: "Profit rate", exact: true }).fill("32");
  return line;
}

async function expectSingleProfitRow(calculation: Locator, profit: Locator, formula: string): Promise<void> {
  await expect(calculation).toHaveCSS("direction", "ltr");
  await expect(calculation).toContainText(formula);
  const formulaBox = await calculation.getByText(formula, { exact: true }).boundingBox();
  const profitBox = await profit.boundingBox();
  if (!formulaBox || !profitBox) throw new Error("The profit formula and result must be visible");
  expect(formulaBox.x + formulaBox.width).toBeLessThanOrEqual(profitBox.x);
  expect(profitBox.x - formulaBox.x - formulaBox.width, "The profit amount must sit beside its formula").toBeLessThanOrEqual(12);
  const strip = await calculation.boundingBox();
  if (!strip) throw new Error("The profit strip must be visible");
  expect((formulaBox.x + profitBox.x + profitBox.width) / 2, "The complete calculation must be centered inside its strip")
    .toBeCloseTo(strip.x + strip.width / 2, 0);
  expect(Math.max(formulaBox.y, profitBox.y)).toBeLessThan(Math.min(formulaBox.y + formulaBox.height, profitBox.y + profitBox.height));
  expect(await calculation.evaluate((element) => {
    const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const rectangles: DOMRect[] = [];
    while (text.nextNode()) {
      if (!text.currentNode.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(text.currentNode);
      rectangles.push(...Array.from(range.getClientRects()).filter((rectangle) => rectangle.width > 0 && rectangle.height > 0));
    }
    const bounds = element.getBoundingClientRect();
    return rectangles.length > 1
      && Math.max(...rectangles.map((rectangle) => rectangle.top)) < Math.min(...rectangles.map((rectangle) => rectangle.bottom))
      && rectangles.every((rectangle) => rectangle.left >= bounds.left && rectangle.right <= bounds.right);
  }), "Every formula digit and the profit amount must fit on the same line").toBe(true);
}

async function notesPosition(page: Page): Promise<{ y: number; height: number; summaryY: number }> {
  const notes = await page.getByRole("textbox", { name: "Notes", exact: true }).boundingBox();
  const summary = await page.getByRole("main").locator("footer").boundingBox();
  if (!notes || !summary) throw new Error("Notes and payment summary must be present");
  expect(notes.y + notes.height).toBeLessThanOrEqual(summary.y);
  expect(summary.y - notes.y - notes.height).toBeLessThanOrEqual(36);
  expect(summary.y + summary.height).toBeCloseTo(page.viewportSize()?.height ?? 0, 1);
  return { y: notes.y, height: notes.height, summaryY: summary.y };
}

async function expectBillingFitsText(billing: Locator): Promise<void> {
  const measurement = await billing.evaluate((element) => {
    if (!(element instanceof HTMLSelectElement)) throw new Error("Billing must remain a native select");
    const style = getComputedStyle(element);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Text measurement is unavailable");
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const text = element.selectedOptions[0]?.textContent?.trim() ?? "";
    return {
      width: element.getBoundingClientRect().width,
      textWidth: context.measureText(text).width,
      usable: element.clientWidth > 0 && text.length > 0,
    };
  });
  expect(measurement.usable).toBe(true);
  expect(measurement.width, "Billing should allow room for its selected text, arrow and padding without an empty wide tail")
    .toBeLessThanOrEqual(Math.ceil(measurement.textWidth) + 48);
}

async function inputWidth(input: Locator): Promise<number> {
  return input.evaluate((element) => element.getBoundingClientRect().width);
}

async function expectCenteredLabels(line: Locator): Promise<void> {
  const measurements = await line.locator("label").evaluateAll((labels) => labels.map((label) => {
    const control = label.querySelector("input, select")?.getBoundingClientRect();
    if (!control) throw new Error("Every quote field needs a control");
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
    const rectangles: DOMRect[] = [];
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim() || walker.currentNode.parentElement?.closest("select, [aria-hidden='true']")) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      rectangles.push(...Array.from(range.getClientRects()));
    }
    if (!rectangles.length) throw new Error("Every quote field needs a visible title");
    return {
      title: label.textContent,
      titleCenter: (Math.min(...rectangles.map((box) => box.left)) + Math.max(...rectangles.map((box) => box.right))) / 2,
      controlCenter: control.x + control.width / 2,
    };
  }));
  expect(measurements).toHaveLength(4);
  for (const field of measurements) {
    expect(Math.abs(field.titleCenter - field.controlCenter), `${field.title} must be centered over its control`).toBeLessThanOrEqual(1);
  }
}

async function expectControlsContained(page: Page, line: Locator): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await line.evaluate((element) => {
    const card = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll("input, select")).every((control) => {
      const bounds = control.getBoundingClientRect();
      return bounds.left >= card.left && bounds.right <= card.right;
    });
  }), "Every editable quote control must fit inside its card").toBe(true);
}

test("aligns customer, Sales Proposal and New Order while keeping quote controls compact", async ({ page, hasTouch }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const customer = page.getByLabel("Customer", { exact: true });
  const proposal = page.getByLabel("Sales Proposal", { exact: true });
  const newOrder = page.getByRole("button", { name: "New Order", exact: true });
  await customer.fill("Compact quote customer");
  await proposal.fill("COMPACT-001");
  await addPricedLine(page);
  const line = page.getByTestId("quote-line").first();
  const [customerBox, proposalBox, newOrderBox] = await Promise.all([customer, proposal, newOrder].map((control) => control.boundingBox()));
  if (!customerBox || !proposalBox || !newOrderBox) throw new Error("The customer row must contain all three controls");
  const boxes = [customerBox, proposalBox, newOrderBox];
  expect(customerBox.x + customerBox.width).toBeLessThanOrEqual(proposalBox.x);
  expect(proposalBox.x + proposalBox.width).toBeLessThanOrEqual(newOrderBox.x);
  expect(Math.max(...boxes.map((box) => box.y))).toBeLessThan(Math.min(...boxes.map((box) => box.y + box.height)));
  await expect(newOrder).toHaveText("New Order");
  await expect(newOrder.locator("svg")).toHaveCount(0);
  const billing = line.getByRole("combobox", { name: "Billing Option", exact: true });
  const cardBox = await line.boundingBox();
  if (!cardBox) throw new Error("The quote card must be visible");
  await expectBillingFitsText(billing);
  await expectCenteredLabels(line);
  for (const [name, maximum] of [["Quantity", 60], ["Price", 80], ["Profit rate", 85]] as const) {
    const field = line.getByRole("textbox", { name, exact: true });
    const bounds = await field.boundingBox();
    if (!bounds) throw new Error(`${name} must be visible`);
    expect(bounds.width).toBeLessThanOrEqual(maximum);
    expect(bounds.height).toBeGreaterThanOrEqual(hasTouch ? 44 : 32);
    expect(bounds.x).toBeGreaterThanOrEqual(cardBox.x);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
  }
  const profit = line.getByLabel("Business Basic profit per license", { exact: true });
  await expect(profit).toHaveText("$7.04");
  await expectSingleProfitRow(line.getByLabel("Internal price calculation", { exact: true }), profit, "$22.00 × 32% =");
  await expect(line.getByText("Base price + markup · only visible here", { exact: true })).toHaveCount(0);
  await expect(line.getByText("Customer price / license", { exact: true })).toHaveCount(0);
  await expect(line.getByText("Line total", { exact: true })).toHaveCount(0);
  await expect(line.getByLabel("Business Basic line total", { exact: true })).toHaveText("$29.04");
  await expect(page.getByText("USD · Taxes not included", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$29.04");
  for (const value of ["monthly", "annual-upfront", "annual-monthly"]) {
    await billing.selectOption(value);
    await expect(billing).toHaveValue(value);
    await expectBillingFitsText(billing);
    await expectCenteredLabels(line);
    await line.getByRole("textbox", { name: "Price", exact: true }).fill("22");
    await expect(profit).toHaveText("$7.04");
    await expect(line.getByLabel("Business Basic line total", { exact: true })).toHaveText("$29.04");
  }
  await page.getByRole("textbox", { name: "Notes", exact: true }).fill("Notes stay beside the final payment summary.");
  for (const name of ["Business Standard", "Business Premium"]) {
    await page.getByRole("button", { name: `Add ${name} to quote`, exact: true }).press("Enter");
  }
  for (const card of await page.getByTestId("quote-line").all()) {
    await card.getByRole("textbox", { name: "Price", exact: true }).fill("20");
    await card.getByRole("textbox", { name: "Profit rate", exact: true }).fill("32");
    const cardProfit = card.getByLabel(/ profit per license$/);
    await expect(cardProfit).toHaveText("$6.40");
    await expectSingleProfitRow(card.getByLabel("Internal price calculation", { exact: true }), cardProfit, "$20.00 × 32% =");
    await expectCenteredLabels(card);
    const [cardBounds, billingBox, rateBox, quantityBox, priceBox] = await Promise.all([
      card,
      card.getByRole("combobox", { name: "Billing Option", exact: true }),
      ...["Profit rate", "Quantity", "Price"].map((name) => card.getByRole("textbox", { name, exact: true })),
    ].map((control) => control.boundingBox()));
    if (!cardBounds || !billingBox || !rateBox || !quantityBox || !priceBox) throw new Error("All four quote fields must be visible");
    expect(billingBox.y, "Billing Option and Profit rate must share the first row").toBeCloseTo(rateBox.y, 0);
    expect(billingBox.x + billingBox.width).toBeLessThanOrEqual(rateBox.x);
    expect(Math.max(billingBox.y + billingBox.height, rateBox.y + rateBox.height)).toBeLessThan(quantityBox.y);
    expect(quantityBox.y, "Quantity and Price must share the second row").toBeCloseTo(priceBox.y, 0);
    expect(quantityBox.x + quantityBox.width).toBeLessThanOrEqual(priceBox.x);
    const [quantityField, priceField] = await Promise.all(["Quantity", "Price"].map((name) =>
      card.getByRole("textbox", { name, exact: true }).evaluate((element) => {
        const box = element.closest("label")?.getBoundingClientRect();
        if (!box) throw new Error("Quantity and Price must have visible labels");
        return { left: box.left, right: box.right };
      })));
    expect((quantityField.left + priceField.right) / 2, "Quantity and Price must be centered together")
      .toBeCloseTo(cardBounds.x + cardBounds.width / 2, 0);
  }
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$79.20");
  for (const theme of ["Aurora Ice", "Aurora Ocean"]) {
    await openSettings(page);
    await page.getByRole("button", { name: "Browse themes", exact: true }).click();
    const gallery = page.getByRole("dialog", { name: "Choose your theme", exact: true });
    await gallery.getByRole("button", { name: theme, exact: true }).click();
    await gallery.getByRole("button", { name: "Done", exact: true }).click();
    await closeSettings(page);
    await expect(profit).toHaveText("$6.40");
    await expect(proposal).toHaveValue("COMPACT-001");
    await page.mouse.move(0, 0);
    await page.screenshot({ path: testInfo.outputPath(`compact-${theme.toLowerCase().replaceAll(" ", "-")}-desktop.png`) });
    await line.screenshot({ path: testInfo.outputPath(`content-fit-card-${theme.toLowerCase().replaceAll(" ", "-")}.png`) });
    if (theme === "Aurora Ice") {
      await billing.click();
      await expect(billing.getByRole("option", { name: "Annual — Pay Monthly", exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("compact-billing-picker-open.png") });
      await page.keyboard.press("Escape");
      await expect(billing).toHaveValue("annual-monthly");
    }
  }
});

test("grows and shrinks quote fields with their values while retaining focus, validation and saved data", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // At 150%, even a four-digit quantity exceeds the 44px minimum touch target.
  await setTextSize(page, "150");
  const customer = page.getByLabel("Customer", { exact: true });
  const proposal = page.getByLabel("Sales Proposal", { exact: true });
  await customer.fill("A");
  await proposal.fill("P");
  const line = await addPricedLine(page);
  await page.screenshot({ path: testInfo.outputPath("content-fit-short-fields.png") });
  for (const control of [
    { field: customer, short: "A", long: "A customer with a longer company name", max: "C".repeat(200) },
    { field: proposal, short: "P", long: "PROPOSAL-123456789", max: "P".repeat(64) },
    { field: line.getByLabel("Quantity", { exact: true }), short: "1", long: "9999", max: "9999" },
    { field: line.getByRole("textbox", { name: "Price", exact: true }), short: "2", long: "1000000", max: "1000000" },
    { field: line.getByRole("textbox", { name: "Profit rate", exact: true }), short: "1", long: "99.99", max: "100" },
  ]) {
    await control.field.fill(control.short);
    const shortWidth = await inputWidth(control.field);
    await control.field.fill(control.long);
    await expect(control.field).toBeFocused();
    expect(await inputWidth(control.field), "A longer value must expand its field beyond the editable minimum").toBeGreaterThan(shortWidth + 1);
    await control.field.fill(control.short);
    expect(await inputWidth(control.field), "The field must shrink again after shortening its value").toBeCloseTo(shortWidth, 1);
    await control.field.fill(control.max);
    await expect(control.field).toHaveValue(control.max);
    await expectControlsContained(page, line);
  }
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$19,998,000,000.00");
  for (const [index, field] of [line.getByLabel("Quantity", { exact: true }), line.getByRole("textbox", { name: "Price", exact: true }), line.getByRole("textbox", { name: "Profit rate", exact: true })].entries()) {
    const saved = await field.inputValue();
    await field.fill("");
    await expect(field).toBeFocused();
    expect(await inputWidth(field)).toBeGreaterThanOrEqual(32);
    await expect(page.getByRole("button", { name: "Export PDF", exact: true })).toBeDisabled();
    await expectControlsContained(page, line);
    await line.screenshot({ path: testInfo.outputPath(`content-fit-blank-field-${index}.png`) });
    await field.fill(saved);
  }
  await expect(page.getByRole("button", { name: "Export PDF", exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("content-fit-maximum-fields.png") });
  await page.reload();
  await expect(customer).toHaveValue("C".repeat(200));
  await expect(proposal).toHaveValue("P".repeat(64));
  await expect(line.getByLabel("Quantity", { exact: true })).toHaveValue("9999");
  await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("1000000");
  await expect(line.getByRole("textbox", { name: "Profit rate", exact: true })).toHaveValue("100");
  await expectControlsContained(page, line);
});

test("keeps Notes docked above payments while one or many quote cards scroll independently", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("Docked notes customer");
  await addPricedLine(page);
  const notes = page.getByRole("textbox", { name: "Notes", exact: true });
  await notes.fill("Keep this note visible while reviewing all license lines.");
  const withOneCard = await notesPosition(page);
  for (let index = 1; index < 16; index += 1) await addPricedLine(page);
  await expect(page.getByTestId("quote-line")).toHaveCount(16);
  const withManyCards = await notesPosition(page);
  expect(withManyCards.y).toBeCloseTo(withOneCard.y, 1);
  expect(withManyCards.summaryY).toBeCloseTo(withOneCard.summaryY, 1);
  const first = page.getByTestId("quote-line").first();
  const last = page.getByTestId("quote-line").last();
  await first.scrollIntoViewIfNeeded();
  const firstPosition = await first.boundingBox();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  const scrolledFirstPosition = await first.boundingBox();
  if (!firstPosition || !scrolledFirstPosition) throw new Error("The first quote card must remain in the document");
  expect(firstPosition.y - scrolledFirstPosition.y).toBeGreaterThan(500);
  const afterScrolling = await notesPosition(page);
  expect(afterScrolling.y).toBeCloseTo(withOneCard.y, 1);
  expect(afterScrolling.summaryY).toBeCloseTo(withOneCard.summaryY, 1);
  await expect(notes).toBeInViewport();
  await expect(notes).toHaveValue("Keep this note visible while reviewing all license lines.");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$464.64");
  await page.screenshot({ path: testInfo.outputPath("compact-many-cards-docked-notes.png") });
  await page.reload();
  await expect(notes).toHaveValue("Keep this note visible while reviewing all license lines.");
  await expect(page.getByTestId("quote-line")).toHaveCount(16);
});

test("fits English and Hebrew controls and the profit formula at 320px and 150% including maximum valid values", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("לקוח קומפקטי");
  await page.getByLabel("Sales Proposal", { exact: true }).fill("COMPACT-RTL");
  const line = await addPricedLine(page);
  await openSettings(page);
  await page.getByRole("combobox", { name: "Text size", exact: true }).selectOption("150");
  await page.getByRole("button", { name: "Browse themes", exact: true }).click();
  const gallery = page.getByRole("dialog", { name: "Choose your theme", exact: true });
  await gallery.getByRole("button", { name: "Aurora Ocean", exact: true }).click();
  await gallery.getByRole("button", { name: "Done", exact: true }).click();
  await closeSettings(page);
  for (const locale of [
    { id: "en", billing: "Billing Option", price: "Price", quantity: "Quantity", rate: "Profit rate", export: "Export PDF", total: "Business Basic line total", oldLabel: "Line total" },
    { id: "he", billing: "מסלול חיוב", price: "מחיר", quantity: "כמות", rate: "שיעור רווח", export: "ייצוא PDF", total: "סכום השורה Business Basic", oldLabel: "סכום שורה" },
  ]) {
    if (locale.id === "he") {
      await openSettings(page);
      await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
      await closeSettings(page);
    }
    const billing = line.getByRole("combobox", { name: locale.billing, exact: true });
    const price = line.getByRole("textbox", { name: locale.price, exact: true });
    for (const value of ["monthly", "annual-upfront", "annual-monthly"]) {
      await billing.selectOption(value);
      await expect(billing).toHaveValue(value);
      await expectBillingFitsText(billing);
      await price.fill("22");
      await expect(line.getByLabel(locale.total, { exact: true })).toHaveText("$29.04");
      await expectControlsContained(page, line);
      await expectCenteredLabels(line);
    }
    await expect(line.getByText(locale.oldLabel, { exact: true })).toHaveCount(0);
    for (const [name, invalid, valid] of [[locale.quantity, "99999", "1"], [locale.price, "1000001", "22"], [locale.rate, "101", "32"]]) {
      const field = line.getByRole("textbox", { name, exact: true });
      for (const value of ["", invalid]) {
        await field.fill(value);
        await expect(field).toBeFocused();
        await expect(page.getByRole("button", { name: locale.export, exact: true })).toBeDisabled();
        await expectControlsContained(page, line);
      }
      await field.fill(valid);
      await expect(page.getByRole("button", { name: locale.export, exact: true })).toBeEnabled();
    }
    await line.screenshot({ path: testInfo.outputPath(`content-fit-${locale.id}-320-150.png`) });
  }
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByLabel("הצעת מכירה", { exact: true })).toHaveValue("COMPACT-RTL");
  await expect(line.getByRole("textbox", { name: "שיעור רווח", exact: true })).toHaveValue("32");
  const profit = line.getByLabel("רווח לרישיון Business Basic", { exact: true });
  const calculation = line.getByLabel("חישוב מחיר פנימי", { exact: true });
  await expect(profit).toHaveText("$7.04");
  await expectSingleProfitRow(calculation, profit, "$22.00 × 32% =");
  await page.getByRole("textbox", { name: "הערות", exact: true }).fill("הערות נשמרות מעל סיכום התשלומים.");
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  await page.screenshot({ path: testInfo.outputPath("compact-quote-hebrew-320.png"), fullPage: true });
  await page.getByLabel("לקוח", { exact: true }).fill("ל".repeat(200));
  await page.getByLabel("הצעת מכירה", { exact: true }).fill("P".repeat(64));
  await line.getByRole("textbox", { name: "כמות", exact: true }).fill("9999");
  await line.getByRole("textbox", { name: "מחיר", exact: true }).fill("1000000");
  await line.getByRole("textbox", { name: "שיעור רווח", exact: true }).fill("100");
  await expect(profit).toHaveText("$1,000,000.00");
  await expectSingleProfitRow(calculation, profit, "$1,000,000.00 × 100% =");
  await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$19,998,000,000.00");
  await expect(page.getByRole("button", { name: "ייצוא PDF", exact: true })).toBeEnabled();
  await expectControlsContained(page, line);
  const notesBox = await page.getByRole("textbox", { name: "הערות", exact: true }).boundingBox();
  const cardBox = await line.boundingBox();
  const summaryBox = await page.getByRole("main").locator("footer").boundingBox();
  if (!notesBox || !cardBox || !summaryBox) throw new Error("The mobile quote must include cards, notes and payments");
  expect(notesBox.y).toBeGreaterThanOrEqual(cardBox.y + cardBox.height);
  expect(notesBox.y + notesBox.height).toBeLessThanOrEqual(summaryBox.y);
  await line.screenshot({ path: testInfo.outputPath("compact-profit-maximum-hebrew-320.png") });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  await page.screenshot({ path: testInfo.outputPath("content-fit-maximum-hebrew-320.png"), fullPage: true });
  await page.reload();
  await expect(page.getByLabel("לקוח", { exact: true })).toHaveValue("ל".repeat(200));
  await expect(page.getByLabel("הצעת מכירה", { exact: true })).toHaveValue("P".repeat(64));
  await expect(line.getByRole("textbox", { name: "כמות", exact: true })).toHaveValue("9999");
  await expect(line.getByRole("textbox", { name: "מחיר", exact: true })).toHaveValue("1000000");
  await expect(line.getByRole("textbox", { name: "שיעור רווח", exact: true })).toHaveValue("100");
  await expectControlsContained(page, line);
});
