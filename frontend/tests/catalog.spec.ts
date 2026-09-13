import type { Locator, Page } from "@playwright/test";

import { expect, test, setEditMode, openSettings, closeSettings } from "./fixtures";

const catalogKey = "seatline.catalog.v2";

async function enterEditMode(page: Page): Promise<void> {
  await setEditMode(page, true);
  await expect(page.getByRole("button", { name: "Add product", exact: true })).toBeVisible();
}

async function editLicense(page: Page, name: string): Promise<Locator> {
  await page.getByRole("button", { name: `Edit ${name}`, exact: true }).click();
  return page.getByRole("dialog", { name: "Edit license", exact: true });
}

async function editProduct(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Edit product", exact: true }).click();
  return page.getByRole("dialog", { name: "Edit product", exact: true });
}

async function saveChanges(dialog: Locator): Promise<void> {
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function expectPrice(line: Locator, value: number): Promise<void> {
  const input = line.getByRole("textbox", { name: "Price", exact: true });
  await expect(input).not.toHaveValue("");
  expect(Number(await input.inputValue())).toBe(value);
}

test("keeps catalog management in Edit Mode and returns to Normal Mode after reload", async ({ page }) => {
  await page.goto("/");
  await openSettings(page);
  await expect(page.getByRole("switch", { name: "Edit Mode", exact: true })).not.toBeChecked();
  await closeSettings(page);
  await expect(page.getByRole("button", { name: "Add product", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add license", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit product", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit Business Basic", exact: true })).toHaveCount(0);
  await openSettings(page);
  await page.getByRole("switch", { name: "Edit Mode", exact: true }).focus();
  await page.keyboard.press("Space");
  await closeSettings(page);
  await expect(page.getByRole("button", { name: "Edit product", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add product", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add license", exact: true })).toBeVisible();
  const dialog = await editProduct(page);
  await expect(dialog.getByLabel("Product name", { exact: true })).toBeFocused();
  await dialog.getByLabel("Product name", { exact: true }).fill("Unsaved product");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Microsoft 365", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit product", exact: true })).toBeFocused();
  await page.reload();
  await openSettings(page);
  await expect(page.getByRole("switch", { name: "Edit Mode", exact: true })).not.toBeChecked();
  await closeSettings(page);
  await expect(page.getByRole("button", { name: "Add product", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Business Basic to quote", exact: true })).toBeVisible();
});

test("edits built-in names and billing prices without changing existing order lines", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const original = page.getByRole("group", { name: "Business Basic", exact: true });
  await original.getByLabel("Quantity", { exact: true }).fill("2");
  await original.getByRole("textbox", { name: "Price", exact: true }).fill("8.25");
  await enterEditMode(page);
  const productDialog = await editProduct(page);
  await productDialog.getByLabel("Product name", { exact: true }).fill("Microsoft Business");
  await productDialog.getByLabel("Short label", { exact: true }).fill("MS");
  await saveChanges(productDialog);
  const licenseDialog = await editLicense(page, "Business Basic");
  await licenseDialog.getByLabel("License name", { exact: true }).fill("Core seat");
  await licenseDialog.getByLabel("Monthly price", { exact: true }).fill("18.75");
  await licenseDialog.getByLabel("Annual paid monthly price", { exact: true }).fill("12.50");
  await licenseDialog.getByLabel("Annual paid yearly price", { exact: true }).fill("130");
  await saveChanges(licenseDialog);
  await expect(original.getByText("Microsoft 365", { exact: true })).toBeVisible();
  await expectPrice(original, 8.25);
  await setEditMode(page, false);

  for (const [schedule, price] of [["monthly", 18.75], ["annual-monthly", 12.5], ["annual-upfront", 130]] as const) {
    await page.getByRole("button", { name: "Add Core seat to quote", exact: true }).press("Enter");
    const line = page.getByRole("group", { name: "Core seat", exact: true }).last();
    await line.getByRole("combobox", { name: "Billing Option", exact: true }).selectOption(schedule);
    await expect(line.getByRole("combobox", { name: "Billing Option", exact: true })).toHaveValue(schedule);
    await expectPrice(line, price);
  }
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$47.75");
  await expect(page.getByLabel("Yearly payments", { exact: true })).toHaveText("$130.00");
  await page.reload();
  await expect(page.getByRole("button", { name: "Microsoft Business", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Core seat to quote", exact: true })).toBeVisible();
  await expectPrice(original, 8.25);
  await expect(page.getByLabel("12-month estimate", { exact: true })).toHaveText("$703.00");

  await enterEditMode(page);
  const updated = await editLicense(page, "Core seat");
  await expect(updated.getByLabel("Monthly price", { exact: true })).not.toHaveValue("");
  await updated.getByLabel("Monthly price", { exact: true }).fill("999");
  await saveChanges(updated);
  await expectPrice(page.getByRole("group", { name: "Core seat", exact: true }).first(), 18.75);
  const removal = await editLicense(page, "Core seat");
  page.once("dialog", (confirmation) => confirmation.dismiss());
  await removal.getByRole("button", { name: "Delete license", exact: true }).click();
  await expect(removal).toBeVisible();
  page.once("dialog", (confirmation) => confirmation.accept());
  await removal.getByRole("button", { name: "Delete license", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Core seat to quote", exact: true })).toHaveCount(0);
  const removeProduct = await editProduct(page);
  page.once("dialog", (confirmation) => confirmation.dismiss());
  await removeProduct.getByRole("button", { name: "Delete product", exact: true }).click();
  await expect(removeProduct).toBeVisible();
  page.once("dialog", (confirmation) => confirmation.accept());
  await removeProduct.getByRole("button", { name: "Delete product", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Microsoft Business", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Microsoft 365", exact: true })).toHaveCount(0);
  await expect(page.getByTestId("quote-line")).toHaveCount(4);
  await expectPrice(original, 8.25);
  await expect(page.getByLabel("12-month estimate", { exact: true })).toHaveText("$703.00");
});

test("saves license prices after creating an empty product, including zero and the maximum price", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("Saved prices customer");
  await enterEditMode(page);
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const product = page.getByRole("dialog", { name: "Add product", exact: true });
  await product.getByLabel("Product name", { exact: true }).fill("Support Tools");
  await product.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(page.getByText("No licenses yet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add license", exact: true }).click();
  const firstLicense = page.getByRole("dialog", { name: "Add license", exact: true });
  await firstLicense.getByLabel("License name", { exact: true }).fill("Support seat");
  await firstLicense.getByLabel("Monthly price", { exact: true }).fill("0");
  await firstLicense.getByLabel("Annual paid yearly price", { exact: true }).fill("1000000");
  await firstLicense.getByRole("button", { name: "Add license", exact: true }).click();
  await page.getByRole("button", { name: "Add license", exact: true }).click();
  const license = page.getByRole("dialog", { name: "Add license", exact: true });
  await license.getByLabel("License name", { exact: true }).fill("Support Pro");
  await license.getByLabel("Annual paid monthly price", { exact: true }).fill("12.25");
  await license.getByRole("button", { name: "Add license", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Support Tools", exact: true }).click();
  await page.getByRole("button", { name: "Add Support Pro to quote", exact: true }).press("Enter");
  await expectPrice(page.getByRole("group", { name: "Support Pro", exact: true }), 12.25);
  await page.getByRole("button", { name: "Add Support seat to quote", exact: true }).press("Enter");
  await expect(page.getByRole("group", { name: "Support seat", exact: true }).getByRole("textbox", { name: "Price", exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Remove Support seat", exact: true }).click();
  await page.getByRole("button", { name: "Add Support seat to quote", exact: true }).press("Enter");
  await page.getByRole("group", { name: "Support seat", exact: true }).getByRole("combobox", { name: "Billing Option", exact: true }).selectOption("monthly");
  await expectPrice(page.getByRole("group", { name: "Support seat", exact: true }), 0);
  await expect(page.getByRole("button", { name: "Export PDF", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Add Support seat to quote", exact: true }).press("Enter");
  await page.getByRole("group", { name: "Support seat", exact: true }).last().getByRole("combobox", { name: "Billing Option", exact: true }).selectOption("annual-upfront");
  await expectPrice(page.getByRole("group", { name: "Support seat", exact: true }).last(), 1000000);
  await expect(page.getByLabel("Yearly payments", { exact: true })).toHaveText("$1,000,000.00");
});

test("rejects duplicate names and invalid default prices without overwriting saved entries", async ({ page }) => {
  await page.goto("/");
  await enterEditMode(page);
  const product = await editProduct(page);
  await product.getByLabel("Product name", { exact: true }).fill(" google workspace ");
  await product.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(product.getByRole("alert")).toContainText(/already/i);
  await expect(product.getByLabel("Short label", { exact: true })).toHaveAttribute("maxlength", "4");
  await product.getByRole("button", { name: "Cancel", exact: true }).click();
  const license = await editLicense(page, "Business Basic");
  await license.getByLabel("License name", { exact: true }).fill(" business standard ");
  await license.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(license.getByRole("alert")).toContainText(/already/i);
  await license.getByLabel("License name", { exact: true }).fill("Business Basic");
  for (const price of ["-1", "1.234", "1000001", "invalid"]) {
    await license.getByLabel("Monthly price", { exact: true }).fill(price);
    await license.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(license).toBeVisible();
    await expect(license.getByRole("alert")).toContainText(/price/i);
  }
  await license.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Microsoft 365", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Business Basic to quote", exact: true })).toBeVisible();
  await enterEditMode(page);
  const unchanged = await editLicense(page, "Business Basic");
  await expect(unchanged.getByLabel("Monthly price", { exact: true })).toHaveValue("");
});

test("migrates the previous custom catalog and keeps subsequent edits after reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("seatline.catalog.v2");
    localStorage.setItem("saleprice.catalog.v1", JSON.stringify({
      version: 1,
      products: [{ id: "custom-legacy", name: "Legacy Tools", shortName: "LT", licenses: [{ id: "custom-seat", name: "Legacy seat" }] }],
      licenses: [{ productId: "microsoft-365", license: { id: "custom-addon", name: "Legacy addon" } }],
    }));
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Add Legacy addon to quote", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Legacy Tools", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Legacy seat to quote", exact: true })).toBeVisible();
  await enterEditMode(page);
  const legacy = await editLicense(page, "Legacy seat");
  await legacy.getByLabel("License name", { exact: true }).fill("Migrated seat");
  await legacy.getByLabel("Annual paid monthly price", { exact: true }).fill("9.50");
  await saveChanges(legacy);
  const snapshot: unknown = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null") as unknown, catalogKey);
  expect(snapshot).toMatchObject({ version: 2 });
  await page.reload();
  await page.getByRole("button", { name: "Legacy Tools", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Legacy seat to quote", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Add Migrated seat to quote", exact: true }).press("Enter");
  await expectPrice(page.getByRole("group", { name: "Migrated seat", exact: true }), 9.5);
  await page.getByRole("button", { name: "Microsoft 365", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add Legacy addon to quote", exact: true })).toBeVisible();
});

test("persists an empty catalog and can add a product again without losing the order", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  await enterEditMode(page);
  for (const name of ["Business Basic", "Business Standard", "Business Premium"]) {
    const license = await editLicense(page, name);
    page.once("dialog", (confirmation) => confirmation.accept());
    await license.getByRole("button", { name: "Delete license", exact: true }).click();
  }
  await expect(page.getByText("No licenses yet", { exact: true })).toBeVisible();
  for (const name of ["Microsoft 365", "Google Workspace", "Adobe Acrobat", "Zoom Workplace", "Acronis"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const product = await editProduct(page);
    page.once("dialog", (confirmation) => confirmation.accept());
    await product.getByRole("button", { name: "Delete product", exact: true }).click();
  }
  await expect(page.getByText("No products yet", { exact: true })).toBeVisible();
  await expect(page.getByTestId("quote-line")).toHaveCount(1);
  await page.reload();
  await expect(page.getByText("No products yet", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add product", exact: true })).toHaveCount(0);
  await expect(page.getByTestId("quote-line")).toHaveCount(1);
  await enterEditMode(page);
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const replacement = page.getByRole("dialog", { name: "Add product", exact: true });
  await replacement.getByLabel("Product name", { exact: true }).fill("My catalog");
  await replacement.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(page.getByText("No licenses yet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add license", exact: true }).click();
  const newLicense = page.getByRole("dialog", { name: "Add license", exact: true });
  await newLicense.getByLabel("License name", { exact: true }).fill("My license");
  await newLicense.getByRole("button", { name: "Add license", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add My license to quote", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Business Basic", exact: true })).toBeVisible();
});

test("allows catalog edits for the current visit when storage cannot be written", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Storage full", "QuotaExceededError"); };
  });
  await page.goto("/");
  await enterEditMode(page);
  const license = await editLicense(page, "Business Basic");
  await license.getByLabel("Annual paid monthly price", { exact: true }).fill("14.25");
  await saveChanges(license);
  await expect(page.getByText(/Your catalog.*could not be saved/)).toBeVisible();
  await setEditMode(page, false);
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  await expectPrice(page.getByRole("group", { name: "Business Basic", exact: true }), 14.25);
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$14.25");
});

for (const invalid of [
  { name: "malformed JSON", value: "{invalid" },
  { name: "invalid catalog shape", value: JSON.stringify({ version: 2, products: null }) },
  { name: "invalid saved price", value: JSON.stringify({ version: 2, products: [{
    id: "custom-invalid", name: "Invalid saved product", shortName: "Bad",
    licenses: [{ id: "custom-invalid-seat", name: "Invalid seat", prices: { monthly: "-1", "annual-monthly": "", "annual-upfront": "" } }],
  }] }) },
]) {
  test(`recovers from ${invalid.name} without adding invalid catalog data to orders`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: catalogKey, value: invalid.value });
    await page.goto("/");
    await expect(page.getByRole("alert")).toContainText(/Saved products/i);
    await expect(page.getByRole("button", { name: "Invalid saved product", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
    await expect(page.getByRole("group", { name: "Business Basic", exact: true }).getByRole("textbox", { name: "Price", exact: true })).toHaveValue("");
    await expect(page.getByTestId("quote-line")).toHaveCount(1);
  });
}
