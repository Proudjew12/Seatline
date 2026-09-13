import { readFile } from "node:fs/promises";

import type { Locator, Page } from "@playwright/test";

import { expect, test, setEditMode } from "./fixtures";

const draftKey = "seatline.quote.v1";

function quoteLine(page: Page, name: string): Locator {
  return page.getByRole("group", { name, exact: true });
}

async function addLicense(page: Page, name: string): Promise<Locator> {
  await page.getByRole("button", { name: `Add ${name} to quote`, exact: true }).press("Enter");
  const line = quoteLine(page, name);
  await expect(line).toBeVisible();
  return line;
}

async function priceLine(line: Locator, quantity: string, price: string): Promise<void> {
  await line.getByLabel("Quantity", { exact: true }).fill(quantity);
  await line.getByRole("textbox", { name: "Price", exact: true }).fill(price);
}

async function expectAmount(page: Page, name: string, value: string): Promise<void> {
  await expect(page.getByLabel(name, { exact: true })).toHaveText(value);
}

async function saveBasicDefaultPrice(page: Page): Promise<void> {
  await setEditMode(page, true);
  await page.getByRole("button", { name: "Edit Business Basic", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit license", exact: true });
  await dialog.getByLabel("Annual paid monthly price", { exact: true }).fill("15.50");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await setEditMode(page, false);
}

async function expectEmptyQuote(page: Page): Promise<void> {
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
  await expect(page.getByText("Drag a license card here to add it", { exact: true })).toBeVisible();
  await expect(page.getByText(/Your next quote starts here|Drop another license here/)).toHaveCount(0);
}

test("starts empty, switches products, and searches licenses without requiring the API", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page).toHaveTitle("Seatline");
  await expect(page.getByRole("main", { name: "Order", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your quote" })).toHaveCount(0);
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export PDF", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Google Workspace", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Business Starter to quote" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Business Basic to quote" })).toHaveCount(0);
  await page.getByRole("button", { name: "Microsoft 365", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Search licenses", exact: true });
  await search.fill("premium");
  await expect(page.getByRole("button", { name: "Add Business Premium to quote" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Business Basic to quote" })).toHaveCount(0);
  await search.fill("a license that does not exist");
  await expect(page.getByRole("button", { name: /^Add .* to quote$/ })).toHaveCount(0);
  await search.clear();
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).focus();
  await page.keyboard.press("Enter");
  const line = quoteLine(page, "Business Basic");
  await expect(line).toBeVisible();
  await expect(page.getByTestId("quote-line")).toHaveCount(1);
  const heading = line.getByRole("heading", { name: /^Microsoft 365.*Business Basic$/, level: 2 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveAccessibleName("Microsoft 365 Business Basic");
  await expect(heading.getByText("Business Basic", { exact: true })).toBeVisible();
  await expect(heading.locator("strong")).toHaveText("Microsoft 365");
  const productTitle = await heading.getByText("Microsoft 365", { exact: true }).boundingBox();
  const licenseTitle = await heading.getByText("Business Basic", { exact: true }).boundingBox();
  if (!productTitle || !licenseTitle) throw new Error("Both product and license titles must be visible");
  expect(productTitle.y + productTitle.height).toBeLessThanOrEqual(licenseTitle.y);
  await expect(line.getByRole("heading")).toHaveCount(1);
  await expect(line.getByText("Price", { exact: true })).toBeVisible();
  await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("");
  expect(apiRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("calculates mixed billing correctly, preserves edits, removes lines, and downloads a PDF", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("Acme & Sons – ירושלים");
  await page.getByLabel("Sales Proposal", { exact: true }).fill("QA-2026-001");
  const basic = await addLicense(page, "Business Basic");
  await basic.getByRole("combobox", { name: "Billing Option", exact: true }).selectOption("monthly");
  await priceLine(basic, "3", "12.50");
  await expect(basic.getByText("per month", { exact: true })).toBeVisible();
  const standard = await addLicense(page, "Business Standard");
  await standard.getByRole("combobox", { name: "Billing Option", exact: true }).selectOption("annual-monthly");
  await priceLine(standard, "2", "8");
  await expect(standard.getByText("per month", { exact: true })).toBeVisible();
  const premium = await addLicense(page, "Business Premium");
  await premium.getByRole("combobox", { name: "Billing Option", exact: true }).selectOption("annual-upfront");
  await priceLine(premium, "4", "120");
  await expect(premium.getByRole("textbox", { name: "Price", exact: true })).toBeVisible();
  await expect(premium.getByText("per year", { exact: true })).toBeVisible();

  await expectAmount(page, "Monthly payments", "$53.50");
  await expectAmount(page, "Yearly payments", "$480.00");
  await expectAmount(page, "Due at start", "$533.50");
  await expectAmount(page, "12-month estimate", "$1,122.00");
  await page.reload();
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("Acme & Sons – ירושלים");
  await expect(page.getByLabel("Sales Proposal", { exact: true })).toHaveValue("QA-2026-001");
  await expect(quoteLine(page, "Business Premium").getByRole("combobox", { name: "Billing Option", exact: true })).toHaveValue("annual-upfront");
  await expectAmount(page, "12-month estimate", "$1,122.00");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  expect(await download.failure()).toBeNull();
  const pdfPath = testInfo.outputPath("quote.pdf");
  await download.saveAs(pdfPath);
  const pdf = await readFile(pdfPath);
  expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(pdf.subarray(-1024).toString("ascii")).toContain("%%EOF");
  expect(pdf.length).toBeGreaterThan(1000);
  await page.screenshot({ path: testInfo.outputPath("quote.png"), fullPage: true });

  await page.getByRole("button", { name: "Remove Business Standard", exact: true }).click();
  await expect(quoteLine(page, "Business Standard")).toHaveCount(0);
  await expectAmount(page, "Monthly payments", "$37.50");
  await expectAmount(page, "12-month estimate", "$930.00");
});

test("blocks incomplete and invalid numeric inputs while accepting a zero price", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("Validation customer");
  const line = await addLicense(page, "Business Basic");
  const exportButton = page.getByRole("button", { name: "Export PDF", exact: true });
  await expect(exportButton).toBeDisabled();
  await priceLine(line, "2", "12.50");
  await expect(exportButton).toBeEnabled();
  for (const quantity of ["", "0", "-1", "1.5", "10000"]) {
    await line.getByLabel("Quantity", { exact: true }).fill(quantity);
    await expect(exportButton, `Quantity ${JSON.stringify(quantity)} must be invalid`).toBeDisabled();
  }
  await line.getByLabel("Quantity", { exact: true }).fill("2");
  for (const price of ["", "-1", "1.234", "1000001"]) {
    await line.getByRole("textbox", { name: "Price", exact: true }).fill(price);
    await expect(exportButton, `Price ${JSON.stringify(price)} must be invalid`).toBeDisabled();
  }
  await priceLine(line, "9999", "1000000");
  await expect(exportButton).toBeEnabled();
  await expectAmount(page, "12-month estimate", "$119,988,000,000.00");
  await line.getByLabel("Quantity", { exact: true }).fill("2");
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("0");
  await expect(exportButton).toBeEnabled();
  await expectAmount(page, "12-month estimate", "$0.00");
  await page.getByLabel("Customer", { exact: true }).clear();
  await expect(exportButton).toBeDisabled();
  await page.getByLabel("Customer", { exact: true }).fill("Validation customer");
  await line.getByRole("combobox", { name: "Billing Option", exact: true }).selectOption("annual-upfront");
  await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("");
  await expect(line.getByText("per year", { exact: true })).toBeVisible();
  await expect(exportButton).toBeDisabled();
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("120");
  await expectAmount(page, "12-month estimate", "$240.00");
  await line.getByRole("textbox", { name: "Price", exact: true }).clear();
  await page.reload();
  await expect(quoteLine(page, "Business Basic").getByRole("textbox", { name: "Price", exact: true })).toHaveValue("");
  await expect(exportButton).toBeDisabled();
});

test("retains the quote after a PDF font failure and succeeds on retry", async ({ page }) => {
  await page.route("**/fonts/DejaVuSans.ttf", (route) => route.fulfill({
    status: 200, contentType: "application/octet-stream", body: "invalid font",
  }));
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("PDF retry customer");
  const line = await addLicense(page, "Business Basic");
  await priceLine(line, "2", "15");
  const exportButton = page.getByRole("button", { name: "Export PDF", exact: true });
  await exportButton.click();
  await expect(page.getByRole("alert")).toContainText("The PDF could not be created.");
  await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("15");
  await expect(exportButton).toBeEnabled();
  await page.unroute("**/fonts/DejaVuSans.ttf");
  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  expect(await (await downloadPromise).failure()).toBeNull();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const corrupted of [
  { name: "invalid draft shape", value: JSON.stringify({ version: 1, lines: "invalid" }) },
  { name: "unsupported draft version", value: JSON.stringify({ version: 999, lines: [] }) },
  { name: "malformed draft JSON", value: "{invalid" },
  { name: "missing quote date", value: JSON.stringify({ version: 1, reference: "QA", customer: "Customer", notes: "", date: "", lines: [] }) },
]) {
  test(`recovers from ${corrupted.name} and can edit a new quote`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: draftKey, value: corrupted.value,
    });
    await page.goto("/");
    await expect(page.getByRole("alert")).toContainText(/saved quote/i);
    await expect(page.getByTestId("quote-line")).toHaveCount(0);
    const line = await addLicense(page, "Business Basic");
    await priceLine(line, "1", "10");
    await expectAmount(page, "Monthly payments", "$10.00");
  });
}

test("keeps quoting available when browser storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "QuotaExceededError"); };
  });
  await page.goto("/");
  await expect(page.getByRole("main", { name: "Order", exact: true })).toBeVisible();
  const line = await addLicense(page, "Business Basic");
  await priceLine(line, "2", "15");
  await expectAmount(page, "Monthly payments", "$30.00");
  await expect(page.getByText(/saved quote is unavailable|Changes.*not.*kept|could not.*save/i).first()).toBeVisible();
});

test("adds custom products and licenses and retains them after reload", async ({ page }) => {
  await page.goto("/");
  await setEditMode(page, true);
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const productDialog = page.getByRole("dialog", { name: "Add product", exact: true });
  await productDialog.getByLabel("Product name", { exact: true }).fill("A Product");
  await productDialog.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("No licenses yet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add license", exact: true }).click();
  const firstLicense = page.getByRole("dialog", { name: "Add license", exact: true });
  await firstLicense.getByLabel("License name", { exact: true }).fill("Agent seat");
  await firstLicense.getByRole("button", { name: "Add license", exact: true }).click();
  await addLicense(page, "Agent seat");
  await page.getByRole("button", { name: "Add license", exact: true }).click();
  const licenseDialog = page.getByRole("dialog", { name: "Add license", exact: true });
  await licenseDialog.getByLabel("License name", { exact: true }).fill("Supervisor seat");
  await licenseDialog.getByRole("button", { name: "Add license", exact: true }).click();
  await addLicense(page, "Supervisor seat");
  await page.reload();
  await page.getByRole("button", { name: "A Product", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Supervisor seat to quote" })).toBeVisible();
  await expect(quoteLine(page, "Agent seat")).toBeVisible();
  await expect(quoteLine(page, "Supervisor seat")).toBeVisible();
});

test("ignores catalog clicks and canceled or outside drags, adding once after a real mouse drop", async ({ page, isMobile }) => {
  test.skip(isMobile, "This scenario verifies desktop mouse input.");
  await page.goto("/");
  await saveBasicDefaultPrice(page);
  const card = page.getByRole("button", { name: "Add Business Basic to quote", exact: true });
  const target = page.getByRole("region", { name: "Quote items", exact: true });
  await expectEmptyQuote(page);
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
  const sourceBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Drag source and quote must be visible.");
  let start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 32, start.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
  await card.hover();
  const outsideReturn = await card.boundingBox();
  if (!outsideReturn) throw new Error("The card dropped outside the order must return to the catalog.");
  start = { x: outsideReturn.x + outsideReturn.width / 2, y: outsideReturn.y + outsideReturn.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 32, start.y, { steps: 8 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByTestId("quote-line")).toHaveCount(0);

  for (const count of [1, 2]) {
    // Wait for return feedback and remeasure the populated order before the next drag.
    await card.hover();
    const returnedBox = await card.boundingBox();
    const orderBox = await target.boundingBox();
    if (!returnedBox || !orderBox) throw new Error("The catalog card and order must remain available for another drop.");
    await page.mouse.move(returnedBox.x + returnedBox.width / 2, returnedBox.y + returnedBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(orderBox.x + orderBox.width / 2, orderBox.y + orderBox.height / 2, { steps: 20 });
    await page.mouse.up();
    await expect(page.getByTestId("quote-line")).toHaveCount(count);
    expect(Number(await quoteLine(page, "Business Basic").last().getByRole("textbox", { name: "Price", exact: true }).inputValue())).toBe(15.5);
    await expect(page.getByText(/Drag a license card here to add it|Drop another license here/)).toHaveCount(0);
    await card.click();
    await expect(page.getByTestId("quote-line")).toHaveCount(count);
  }
  for (const count of [1, 0]) {
    await page.getByRole("button", { name: "Remove Business Basic", exact: true }).first().click();
    await expect(page.getByTestId("quote-line")).toHaveCount(count);
  }
  await expectEmptyQuote(page);
});

test("ignores tablet taps, cancels safely, and adds once from an immediate finger drag", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "This scenario verifies tablet touchscreen input.");
  await page.goto("/");
  await saveBasicDefaultPrice(page);
  const card = page.getByRole("button", { name: "Add Business Basic to quote", exact: true });
  const target = page.getByRole("region", { name: "Quote items", exact: true });
  await expectEmptyQuote(page);
  await card.tap();
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
  const sourceBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Tablet drag source and quote must be visible together.");
  const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const session = await context.newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + 16, y: start.y, id: 1 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await expect(page.getByTestId("quote-line")).toHaveCount(0);

    for (const count of [1, 2]) {
      await card.tap({ trial: true });
      const returnedBox = await card.boundingBox();
      const orderBox = await target.boundingBox();
      if (!returnedBox || !orderBox) throw new Error("The tablet card and order must remain available for another drop.");
      const immediateStart = { x: returnedBox.x + returnedBox.width / 2, y: returnedBox.y + returnedBox.height / 2 };
      const end = { x: orderBox.x + orderBox.width / 2, y: orderBox.y + orderBox.height / 2 };
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...immediateStart, id: 1 }] });
      // Move beyond the old hold sensor's tolerance immediately; no stationary press.
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ x: immediateStart.x + 16, y: immediateStart.y, id: 1 }],
      });
      for (let step = 1; step <= 20; step += 1) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: immediateStart.x + (end.x - immediateStart.x) * step / 20, y: immediateStart.y + (end.y - immediateStart.y) * step / 20, id: 1 }],
        });
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect(page.getByTestId("quote-line")).toHaveCount(count);
      expect(Number(await quoteLine(page, "Business Basic").last().getByRole("textbox", { name: "Price", exact: true }).inputValue())).toBe(15.5);
      await expect(page.getByText(/Drag a license card here to add it|Drop another license here/)).toHaveCount(0);
    }
  } finally {
    await session.detach();
  }
  await page.getByRole("button", { name: "Add Business Standard to quote", exact: true }).tap();
  await expect(quoteLine(page, "Business Standard")).toHaveCount(0);
  await expect(page.getByTestId("quote-line")).toHaveCount(2);
  await page.getByRole("button", { name: "Add Business Standard to quote", exact: true }).press("Space");
  await expect(quoteLine(page, "Business Standard")).toBeVisible();
  await expect(page.getByTestId("quote-line")).toHaveCount(3);
  for (const count of [2, 1, 0]) {
    await page.getByTestId("quote-line").first().getByRole("button", { name: /^Remove / }).tap();
    await expect(page.getByTestId("quote-line")).toHaveCount(count);
  }
  await expectEmptyQuote(page);
});
