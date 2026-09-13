import type { Locator, Page } from "@playwright/test";

import { closeSettings, expect, openSettings, setEditMode, test } from "./fixtures";

const catalogKey = "seatline.catalog.v2";

async function editProduct(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Edit product", exact: true }).click();
  return page.getByRole("dialog", { name: "Edit product", exact: true });
}

async function editLicense(page: Page, name: string): Promise<Locator> {
  await page.getByRole("button", { name: `Edit ${name}`, exact: true }).click();
  return page.getByRole("dialog", { name: "Edit license", exact: true });
}

async function save(dialog: Locator): Promise<void> {
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function addLine(page: Page, name: string): Promise<Locator> {
  await page.getByRole("button", { name: `Add ${name} to quote`, exact: true }).press("Enter");
  return page.getByRole("group", { name, exact: true }).last();
}

function profitRate(container: Locator): Locator {
  return container.getByRole("textbox", { name: "Profit rate", exact: true });
}

test("inherits product profit, preserves an explicit zero, and never reprices existing quote lines", async ({ page }) => {
  await page.goto("/");
  await setEditMode(page, true);
  let product = await editProduct(page);
  await expect(profitRate(product)).toHaveValue("0");
  await profitRate(product).fill("17.25");
  await save(product);
  let license = await editLicense(page, "Business Basic");
  await expect(profitRate(license)).toHaveValue("");
  await expect(license.getByText("17.25%", { exact: true })).toBeVisible();
  await license.getByLabel("Annual paid monthly price", { exact: true }).fill("25");
  await save(license);
  await setEditMode(page, false);
  await addLine(page, "Business Basic");
  const original = page.getByRole("group", { name: "Business Basic", exact: true }).first();
  await expect(profitRate(original)).toHaveValue("17.25");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$29.31");
  await profitRate(original).fill("13");

  await setEditMode(page, true);
  product = await editProduct(page);
  await profitRate(product).fill("250.25");
  await save(product);
  license = await editLicense(page, "Business Basic");
  await expect(license.getByText("250.25%", { exact: true })).toBeVisible();
  await profitRate(license).fill("0");
  await save(license);
  await expect(profitRate(original)).toHaveValue("13");
  await setEditMode(page, false);
  const zero = await addLine(page, "Business Basic");
  await expect(profitRate(zero)).toHaveValue("0");
  await original.getByRole("combobox").selectOption("annual-upfront");
  await expect(profitRate(original)).toHaveValue("13");
  await original.getByRole("combobox").selectOption("annual-monthly");
  await page.reload();
  const lines = page.getByRole("group", { name: "Business Basic", exact: true });
  await expect(profitRate(lines.nth(0))).toHaveValue("13");
  await expect(profitRate(lines.nth(1))).toHaveValue("0");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$53.25");

  await setEditMode(page, true);
  license = await editLicense(page, "Business Basic");
  await expect(profitRate(license)).toHaveValue("0");
  await profitRate(license).clear();
  await save(license);
  await setEditMode(page, false);
  const inherited = await addLine(page, "Business Basic");
  await expect(profitRate(inherited)).toHaveValue("250.25");
  await expect(profitRate(lines.nth(0))).toHaveValue("13");
  await expect(profitRate(lines.nth(1))).toHaveValue("0");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$140.81");
  const savedLicense: unknown = await page.evaluate((key) => {
    const catalog = JSON.parse(localStorage.getItem(key) ?? "null") as {
      products: { id: string; licenses: { id: string; markupPercent?: string }[] }[];
    };
    return catalog.products.find((product) => product.id === "microsoft-365")?.licenses
      .find((license) => license.id === "m365-business-basic");
  }, catalogKey);
  expect(savedLicense).toMatchObject({ id: "m365-business-basic" });
  expect(savedLicense).not.toHaveProperty("markupPercent");
  await page.reload();
  await expect(profitRate(lines.nth(2))).toHaveValue("250.25");
});

test("saves product defaults above 100% and inherited or overridden rates on new licenses", async ({ page }) => {
  await page.goto("/");
  await setEditMode(page, true);
  for (const [name, rate, firstRate] of [["Inherited Tools", "150", ""], ["Override Tools", "200", "0"]]) {
    await page.getByRole("button", { name: "Add product", exact: true }).click();
    const product = page.getByRole("dialog", { name: "Add product", exact: true });
    await product.getByLabel("Product name", { exact: true }).fill(name);
    await expect(profitRate(product)).toHaveCount(0);
    await product.getByRole("button", { name: "Add product", exact: true }).click();
    await expect(product).toHaveCount(0);
    await expect(page.getByText("No licenses yet", { exact: true })).toBeVisible();
    const edit = await editProduct(page);
    await expect(profitRate(edit)).toHaveValue("0");
    await profitRate(edit).fill(rate);
    await save(edit);
    await page.getByRole("button", { name: "Add license", exact: true }).click();
    const firstLicense = page.getByRole("dialog", { name: "Add license", exact: true });
    await firstLicense.getByLabel("License name", { exact: true }).fill(`${name} seat`);
    await profitRate(firstLicense).fill(firstRate);
    await firstLicense.getByLabel("Annual paid monthly price", { exact: true }).fill("10");
    await firstLicense.getByRole("button", { name: "Add license", exact: true }).click();
  }
  for (const [name, rate] of [["Inherited add-on", ""], ["Override add-on", "250.25"]]) {
    await page.getByRole("button", { name: "Add license", exact: true }).click();
    const license = page.getByRole("dialog", { name: "Add license", exact: true });
    await expect(license.getByText("200%", { exact: true })).toBeVisible();
    await license.getByLabel("License name", { exact: true }).fill(name);
    await profitRate(license).fill(rate);
    await license.getByLabel("Annual paid monthly price", { exact: true }).fill("10");
    await license.getByRole("button", { name: "Add license", exact: true }).click();
    await expect(license).toHaveCount(0);
  }
  await page.reload();
  await page.getByRole("button", { name: "Inherited Tools", exact: true }).click();
  await expect(profitRate(await addLine(page, "Inherited Tools seat"))).toHaveValue("150");
  await page.getByRole("button", { name: "Override Tools", exact: true }).click();
  for (const [name, rate] of [["Override Tools seat", "0"], ["Inherited add-on", "200"], ["Override add-on", "250.25"]]) {
    await expect(profitRate(await addLine(page, name))).toHaveValue(rate);
  }
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$100.03");
});

test("validates profit defaults without replacing saved rates and accepts both boundaries", async ({ page }) => {
  await page.goto("/");
  await setEditMode(page, true);
  const product = await editProduct(page);
  for (const value of ["-1", "1000000.01", "1.234", "1e1", "invalid"]) {
    await profitRate(product).fill(value);
    await product.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(product.getByRole("alert")).toHaveText("Enter a profit rate from 0 to 1,000,000% with up to two decimal places.");
  }
  await profitRate(product).fill("1000000.00");
  await save(product);
  const license = await editLicense(page, "Business Basic");
  for (const value of ["-0.01", "1000001", "17.255", "NaN"]) {
    await profitRate(license).fill(value);
    await license.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(license.getByRole("alert")).toHaveText("Enter a profit rate from 0 to 1,000,000% with up to two decimal places, or leave it blank.");
  }
  await profitRate(license).fill("0");
  await save(license);
  await page.reload();
  await expect(profitRate(await addLine(page, "Business Basic"))).toHaveValue("0");
  await expect(profitRate(await addLine(page, "Business Standard"))).toHaveValue("1000000.00");
  await setEditMode(page, true);
  const unchanged = await editProduct(page);
  await profitRate(unchanged).fill("1000000.01");
  await unchanged.getByRole("button", { name: "Save changes", exact: true }).click();
  await unchanged.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  await setEditMode(page, true);
  await expect(profitRate(await editProduct(page))).toHaveValue("1000000.00");
});

for (const key of ["saleprice.catalog.v1", "saleprice.catalog.v2", catalogKey]) {
  test(`migrates missing defaults from ${key} while preserving existing quote rates`, async ({ page }) => {
    const products = [{ id: "custom-legacy", name: "Legacy Tools", shortName: "LT", licenses: [
      { id: "custom-seat", name: "Legacy seat" },
    ] }];
    const source = key.endsWith("v1") ? { version: 1, products, licenses: [] } : { version: 2, seedRevision: 1, products };
    const stored = JSON.stringify(source);
    await page.addInitScript(({ key, stored }) => {
      localStorage.setItem(key, stored);
      localStorage.setItem("seatline.quote.v1", JSON.stringify({
        version: 1, sequence: 4, reference: "SP-0004", date: "2026-09-11", customer: "Kept customer", notes: "",
        lines: [{ id: "original", productId: "custom-legacy", productName: "Legacy Tools", licenseId: "custom-seat",
          licenseName: "Legacy seat", quantity: "1", unitPrice: "10", billing: "annual-monthly", markupPercent: "19" }],
      }));
    }, { key, stored });
    await page.goto("/");
    await page.getByRole("button", { name: "Legacy Tools", exact: true }).click();
    const lines = page.getByRole("group", { name: "Legacy seat", exact: true });
    await expect(profitRate(lines.first())).toHaveValue("19");
    await expect(profitRate(await addLine(page, "Legacy seat"))).toHaveValue("0");
    const normalized: unknown = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null") as unknown, catalogKey);
    expect(normalized).toMatchObject({ products: expect.arrayContaining([{
      id: "custom-legacy", name: "Legacy Tools", shortName: "LT", markupPercent: "0", icon: "generic",
      licenses: [{ id: "custom-seat", name: "Legacy seat" }],
    }]) });
    if (key !== catalogKey) expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(stored);
  });
}

for (const invalid of [
  { productRate: "1000000.01", licenseRate: "0" },
  { productRate: "200", licenseRate: "1000000.01" },
  { productRate: "17", licenseRate: "NaN" },
]) {
  test(`rejects invalid saved profit defaults ${invalid.productRate}/${invalid.licenseRate}`, async ({ page }) => {
    const stored = JSON.stringify({ version: 2, seedRevision: 1, products: [{
      id: "invalid", name: "Invalid product", shortName: "Bad", markupPercent: invalid.productRate,
      licenses: [{ id: "invalid-seat", name: "Invalid seat", markupPercent: invalid.licenseRate }],
    }] });
    await page.addInitScript(({ key, stored }) => localStorage.setItem(key, stored), { key: catalogKey, stored });
    await page.goto("/");
    await expect(page.getByRole("alert")).toContainText("Saved products could not be read.");
    await expect(page.getByRole("button", { name: "Invalid product", exact: true })).toHaveCount(0);
    await expect(profitRate(await addLine(page, "Business Basic"))).toHaveValue("0");
    expect(await page.evaluate((key) => localStorage.getItem(key), catalogKey)).toBe(stored);
  });
}

test("keeps Hebrew profit defaults usable at 320px and 150% text size", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => localStorage.setItem("seatline.display.v1", JSON.stringify({
    textSize: 150, theme: "light", locale: "he",
  })));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.evaluate(() => document.fonts.ready);
  const capture = async (name: string) => {
    const path = testInfo.outputPath(`${name}.png`);
    await page.screenshot({ path });
    await testInfo.attach(name, { path, contentType: "image/png" });
  };
  await openSettings(page);
  await page.getByRole("switch", { name: "מצב עריכה", exact: true }).check();
  await closeSettings(page);
  const productTrigger = page.getByRole("button", { name: "עריכת מוצר", exact: true });
  await productTrigger.click();
  const product = page.getByRole("dialog", { name: "עריכת מוצר", exact: true });
  await expect(product.getByLabel("שם המוצר", { exact: true })).toBeFocused();
  const productRate = product.getByLabel("שיעור רווח", { exact: true });
  await productRate.fill("150");
  await expect(productRate).toHaveCSS("direction", "ltr");
  await expect(product.getByText("חל על פריטים חדשים בהצעה. שיעורי הרווח בפריטים קיימים נשמרים.", { exact: true })).toBeVisible();
  await capture("catalog-profit-he-product-320-150");
  await productRate.fill("1000000.01");
  await product.getByRole("button", { name: "שמירת שינויים", exact: true }).click();
  await expect(product.getByRole("alert")).toHaveText("יש להזין שיעור רווח בין 0 ל־1,000,000%, עם עד שתי ספרות אחרי הנקודה.");
  await productRate.fill("150");
  await product.getByRole("button", { name: "שמירת שינויים", exact: true }).click();
  await expect(product).toHaveCount(0);
  await expect(productTrigger).toBeFocused();

  const licenseTrigger = page.getByRole("button", { name: "עריכת Business Basic", exact: true });
  await licenseTrigger.click();
  const license = page.getByRole("dialog", { name: "עריכת רישיון", exact: true });
  await expect(license.getByLabel("שם הרישיון", { exact: true })).toBeFocused();
  const licenseRate = license.getByLabel("שיעור רווח", { exact: true });
  await expect(licenseRate).toHaveValue("");
  await expect(license.getByText("השאירו ריק כדי להשתמש בשיעור הרווח של המוצר:", { exact: false })).toBeVisible();
  await expect(license.getByText("150%", { exact: true })).toHaveCSS("direction", "ltr");
  await licenseRate.focus();
  await capture("catalog-profit-he-license-320-150");
  await licenseRate.fill("1000001");
  await license.getByRole("button", { name: "שמירת שינויים", exact: true }).click();
  await expect(license.getByRole("alert")).toHaveText("הזינו שיעור רווח בין 0 ל־1,000,000%, עם עד שתי ספרות אחרי הנקודה, או השאירו ריק.");
  await licenseRate.fill("0");
  await license.getByLabel("מחיר שנתי בתשלום חודשי", { exact: true }).fill("25");
  await license.getByRole("button", { name: "שמירת שינויים", exact: true }).click();
  await expect(license).toHaveCount(0);
  await expect(licenseTrigger).toBeFocused();
  await page.getByRole("button", { name: "הוספת Business Basic להצעה", exact: true }).press("Enter");
  const basicLines = page.getByRole("group", { name: "Business Basic", exact: true });
  await expect(basicLines.first().getByLabel("שיעור רווח", { exact: true })).toHaveValue("0");
  await licenseTrigger.click();
  await licenseRate.clear();
  await expect(license.getByText("150%", { exact: true })).toBeVisible();
  await license.getByRole("button", { name: "שמירת שינויים", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await page.getByRole("button", { name: "הוספת Business Basic להצעה", exact: true }).press("Enter");
  await expect(basicLines.nth(0).getByLabel("שיעור רווח", { exact: true })).toHaveValue("0");
  await expect(basicLines.nth(1).getByLabel("שיעור רווח", { exact: true })).toHaveValue("150");
  await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$87.50");

  await openSettings(page);
  await page.getByRole("switch", { name: "מצב עריכה", exact: true }).check();
  await closeSettings(page);
  const addProductTrigger = page.getByRole("button", { name: "הוספת מוצר", exact: true });
  await addProductTrigger.click();
  const creation = page.getByRole("dialog", { name: "הוספת מוצר", exact: true });
  await expect(creation.getByLabel("שם המוצר", { exact: true })).toBeFocused();
  await creation.getByLabel("שם המוצר", { exact: true }).fill("RTL Tools");
  await expect(creation.getByLabel("שיעור רווח", { exact: true })).toHaveCount(0);
  await creation.getByRole("button", { name: "הוספת מוצר", exact: true }).click();
  await expect(creation).toHaveCount(0);
  await expect(addProductTrigger).toBeFocused();
  await productTrigger.click();
  await expect(productRate).toHaveValue("0");
  await productRate.fill("17");
  await product.getByRole("button", { name: "שמירת שינויים", exact: true }).click();
  const addLicenseTrigger = page.getByRole("button", { name: "הוספת רישיון", exact: true });
  await addLicenseTrigger.click();
  const addedLicense = page.getByRole("dialog", { name: "הוספת רישיון", exact: true });
  await addedLicense.getByLabel("שם הרישיון", { exact: true }).fill("RTL seat");
  const firstRate = addedLicense.getByLabel("שיעור רווח", { exact: true });
  await firstRate.fill("0");
  await expect(firstRate).toBeFocused();
  await expect(firstRate).toHaveCSS("direction", "ltr");
  await capture("catalog-profit-he-add-license-320-150");
  await addedLicense.getByLabel("מחיר שנתי בתשלום חודשי", { exact: true }).fill("10");
  const createButton = addedLicense.getByRole("button", { name: "הוספת רישיון", exact: true });
  await createButton.focus();
  await expect(createButton).toBeFocused();
  const dialogGeometry = await addedLicense.evaluate((element) => ({
    scrolled: element.scrollTop > 0,
    scrollable: element.scrollHeight > element.clientHeight,
    contained: element.scrollWidth <= element.clientWidth,
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
  }));
  expect(dialogGeometry).toMatchObject({ scrolled: true, scrollable: true, contained: true });
  expect(dialogGeometry.left).toBeGreaterThanOrEqual(0);
  expect(dialogGeometry.right).toBeLessThanOrEqual(320);
  await capture("catalog-profit-he-actions-320-150");
  await createButton.press("Enter");
  await expect(addedLicense).toHaveCount(0);
  await expect(addLicenseTrigger).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "RTL Tools", exact: true }).click();
  await page.getByRole("button", { name: "הוספת RTL seat להצעה", exact: true }).press("Enter");
  await expect(page.getByRole("group", { name: "RTL seat", exact: true }).getByLabel("שיעור רווח", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$97.50");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
