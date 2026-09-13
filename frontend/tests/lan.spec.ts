import { readFile } from "node:fs/promises";

import { expect, test, setEditMode } from "./fixtures";

test("creates, saves, and exports an order when randomUUID is unavailable", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, "randomUUID", { configurable: true, value: undefined });
  });
  await page.goto("/");
  expect(await page.evaluate(() => ({
    randomUUID: typeof crypto.randomUUID,
    getRandomValues: typeof crypto.getRandomValues,
  }))).toEqual({ randomUUID: "undefined", getRandomValues: "function" });
  await page.getByLabel("Customer", { exact: true }).fill("LAN workflow customer");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const builtin = page.getByRole("group", { name: "Business Basic", exact: true });
  await builtin.getByRole("textbox", { name: "Price", exact: true }).fill("10");

  await setEditMode(page, true);
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const productDialog = page.getByRole("dialog", { name: "Add product", exact: true });
  await productDialog.getByLabel("Product name", { exact: true }).fill("LAN Tools");
  await productDialog.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(page.getByText("No licenses yet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add license", exact: true }).click();
  const firstLicense = page.getByRole("dialog", { name: "Add license", exact: true });
  await firstLicense.getByLabel("License name", { exact: true }).fill("Support seat");
  await firstLicense.getByLabel("Annual paid monthly price", { exact: true }).fill("7.50");
  await firstLicense.getByRole("button", { name: "Add license", exact: true }).click();
  await page.getByRole("button", { name: "Add Support seat to quote", exact: true }).press("Enter");
  await page.getByRole("button", { name: "Add license", exact: true }).click();
  const licenseDialog = page.getByRole("dialog", { name: "Add license", exact: true });
  await licenseDialog.getByLabel("License name", { exact: true }).fill("Support Plus");
  await licenseDialog.getByLabel("Annual paid monthly price", { exact: true }).fill("12.50");
  await licenseDialog.getByRole("button", { name: "Add license", exact: true }).click();
  await page.getByRole("button", { name: "Add Support Plus to quote", exact: true }).press("Enter");
  const support = page.getByRole("group", { name: "Support seat", exact: true });
  const plus = page.getByRole("group", { name: "Support Plus", exact: true });
  await support.getByLabel("Quantity", { exact: true }).fill("3");
  await expect(builtin.getByLabel("Quantity", { exact: true })).toHaveValue("1");
  await expect(plus.getByLabel("Quantity", { exact: true })).toHaveValue("1");
  await expect(page.getByTestId("quote-line")).toHaveCount(3);
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$45.00");

  await page.getByRole("button", { name: "Edit Support seat", exact: true }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit license", exact: true });
  await editDialog.getByLabel("License name", { exact: true }).fill("Support Core");
  await editDialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Support Core to quote", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Support Plus to quote", exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "LAN Tools", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Support Core to quote", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Support Plus to quote", exact: true })).toBeVisible();
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("LAN workflow customer");
  await expect(support.getByLabel("Quantity", { exact: true })).toHaveValue("3");
  await expect(builtin.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("10");
  await expect(plus.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("12.50");
  await expect(page.getByTestId("quote-line")).toHaveCount(3);
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$45.00");
  await expect(page.getByRole("alert")).toHaveCount(0);

  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const download = await downloaded;
  expect(await download.failure()).toBeNull();
  const pdfPath = testInfo.outputPath("lan-order.pdf");
  await download.saveAs(pdfPath);
  const pdf = await readFile(pdfPath);
  expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(pdf.subarray(-1024).toString("ascii")).toContain("%%EOF");
});
