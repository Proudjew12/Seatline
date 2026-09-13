import type { Locator, Page } from "@playwright/test";

import { closeSettings, expect, openSettings, setEditMode, test } from "./fixtures";

const catalogKey = "seatline.catalog.v2";

async function openPicker(page: Page): Promise<Locator> {
  await setEditMode(page, true);
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add product", exact: true });
  await dialog.getByRole("button", { name: "Choose icon", exact: true }).click();
  return dialog;
}

test("offers sixty distinct rendered icon silhouettes without duplicate brand choices", async ({ page }, testInfo) => {
  await page.goto("/");
  const dialog = await openPicker(page);
  const choices = dialog.getByRole("group", { name: "Available icons", exact: true });
  await expect(choices.getByRole("radio")).toHaveCount(60);
  const audit = await choices.locator("[data-product-icon]").evaluateAll(async (elements) => {
    const silhouettes = await Promise.all(elements.map(async (element) => {
      const mask = getComputedStyle(element).maskImage;
      const path = /^url\(["']?(.*?)["']?\)$/.exec(mask)?.[1];
      if (!path) throw new Error("A gallery icon has no rendered mask");
      const url = new URL(path, location.href);
      if (url.origin !== location.origin) throw new Error("An icon is not a bundled local asset");
      const image = new Image();
      image.src = url.href;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 24;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Icon silhouette measurement is unavailable");
      context.drawImage(image, 0, 0, 24, 24);
      const pixels = context.getImageData(0, 0, 24, 24).data;
      const alpha = Array.from({ length: 576 }, (_, index) => pixels[index * 4 + 3]);
      if (!alpha.some((value) => value > 0)) throw new Error("A gallery icon is blank");
      return { id: element.getAttribute("data-product-icon"), alpha };
    }));
    const pairs: Array<{ first: string | null; second: string | null; similarity: number }> = [];
    for (let i = 0; i < silhouettes.length; i += 1) {
      for (let j = i + 1; j < silhouettes.length; j += 1) {
        let intersection = 0;
        let union = 0;
        for (let pixel = 0; pixel < 576; pixel += 1) {
          intersection += Math.min(silhouettes[i].alpha[pixel], silhouettes[j].alpha[pixel]);
          union += Math.max(silhouettes[i].alpha[pixel], silhouettes[j].alpha[pixel]);
        }
        pairs.push({ first: silhouettes[i].id, second: silhouettes[j].id, similarity: intersection / union });
      }
    }
    return { ids: silhouettes.map(({ id }) => id), pairs: pairs.sort((a, b) => b.similarity - a.similarity) };
  });
  expect(audit.ids).toHaveLength(60);
  expect(new Set(audit.ids).size).toBe(60);
  // Alpha overlap catches the original shared Google G and matching Microsoft/Windows squares,
  // including near-identical exports with small antialiasing differences.
  expect(audit.pairs.filter(({ similarity }) => similarity >= 0.98), "Indistinguishable icon silhouettes").toEqual([]);
  await testInfo.attach("icon-silhouette-audit", {
    body: JSON.stringify({ count: audit.ids.length, closestPairs: audit.pairs.slice(0, 20) }, null, 2),
    contentType: "application/json",
  });
  await expect(dialog.getByRole("radio", { name: "Google / Workspace", exact: true })).toHaveCount(1);
  await expect(dialog.getByRole("radio", { name: "Microsoft / Windows", exact: true })).toHaveCount(1);
  for (const name of ["Google", "Google Workspace", "Microsoft", "Windows"]) {
    await expect(dialog.getByRole("radio", { name, exact: true })).toHaveCount(0);
  }
  await page.screenshot({ path: testInfo.outputPath("deduplicated-icon-gallery.png") });
});

test("finds the combined choices by English and Hebrew aliases and infers canonical icons", async ({ page }, testInfo) => {
  await page.goto("/");
  const dialog = await openPicker(page);
  const toggle = dialog.getByRole("button", { name: "Choose icon", exact: true });
  const productName = dialog.getByLabel("Product name", { exact: true });
  for (const [name, id] of [["Google Workspace", "google"], ["Google", "google"], ["G Suite", "google"], ["Windows", "microsoft"], ["Microsoft", "microsoft"]]) {
    await productName.fill(name);
    await expect(toggle.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", id);
  }
  await productName.fill("Workspace Design Tools");
  await expect(toggle.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "generic");
  const search = dialog.getByRole("searchbox", { name: "Search icons", exact: true });
  for (const [query, name, id] of [
    ["Workspace", "Google / Workspace", "google"], ["Google", "Google / Workspace", "google"],
    ["Windows", "Microsoft / Windows", "microsoft"], ["Microsoft", "Microsoft / Windows", "microsoft"],
  ]) {
    await search.fill(query);
    const choice = dialog.getByRole("radio", { name, exact: true });
    await choice.locator("xpath=ancestor::label[1]").click();
    await expect(choice).toBeChecked();
    await expect(toggle.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", id);
  }
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await openSettings(page);
  await page.getByRole("combobox", { name: "Text size", exact: true }).selectOption("150");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
  await closeSettings(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: "הוספת מוצר", exact: true }).click();
  const hebrew = page.getByRole("dialog", { name: "הוספת מוצר", exact: true });
  await hebrew.getByRole("button", { name: "בחירת סמל", exact: true }).click();
  const hebrewSearch = hebrew.getByRole("searchbox", { name: "חיפוש סמלים", exact: true });
  for (const [query, name] of [
    ["גוגל", "Google / Workspace"], ["וורקספייס", "Google / Workspace"],
    ["מיקרוסופט", "Microsoft / Windows"], ["ווינדוס", "Microsoft / Windows"], ["חלונות", "Microsoft / Windows"],
  ]) {
    await hebrewSearch.fill(query);
    const choice = hebrew.getByRole("radio", { name, exact: true });
    await choice.locator("xpath=ancestor::label[1]").click();
    await expect(choice).toBeChecked();
  }
  await hebrewSearch.press("Enter");
  await expect(hebrew).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(await hebrew.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await hebrew.getByRole("radio", { name: "Microsoft / Windows", exact: true }).locator("xpath=ancestor::label[1]").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("combined-icon-hebrew-320-150.png") });
});

test("migrates old saved icon IDs without changing licenses, prices, profit rates or quote snapshots", async ({ page }, testInfo) => {
  const products = [
    { id: "custom-google-old", name: "Renamed Cloud Office", shortName: "GO", icon: "google-workspace" },
    { id: "custom-windows-old", name: "Renamed Desktop Tools", shortName: "MW", icon: "windows" },
  ].map((product) => ({ ...product, markupPercent: "17.25", licenses: [
    { id: `${product.id}-zero`, name: `${product.shortName} zero seat`, markupPercent: "0", prices: { monthly: "8.25", "annual-monthly": "10", "annual-upfront": "100" } },
    { id: `${product.id}-inherited`, name: `${product.shortName} inherited seat`, prices: { monthly: "8.25", "annual-monthly": "10", "annual-upfront": "100" } },
  ] }));
  const quote = {
    version: 1, sequence: 9, reference: "SP-0009", date: "2026-09-13", customer: "Saved icon customer", notes: "Keep this proposal",
    lines: [{ id: "saved-original", productId: products[0].id, productName: "Original Cloud Office", licenseId: products[0].licenses[0].id,
      licenseName: "Original seat", quantity: "2", unitPrice: "10", billing: "annual-monthly", markupPercent: "9" }],
  };
  await page.addInitScript(({ key, products, quote }) => {
    if (sessionStorage.getItem("seeded-icon-aliases")) return;
    sessionStorage.setItem("seeded-icon-aliases", "yes");
    localStorage.setItem(key, JSON.stringify({ version: 2, seedRevision: 1, products }));
    localStorage.setItem("seatline.quote.v1", JSON.stringify(quote));
  }, { key: catalogKey, products, quote });
  await page.goto("/");
  const canonicalIds = ["google", "microsoft"];
  const expectedProducts = products.map((product, index) => ({ ...product, icon: canonicalIds[index] }));
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null") as unknown, catalogKey))
    .toEqual({ version: 2, seedRevision: 1, products: expectedProducts });
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$21.80");
  for (const [index, product] of products.entries()) {
    const railButton = page.getByRole("navigation", { name: "Products", exact: true }).getByRole("button", { name: product.name, exact: true });
    await expect(railButton.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", canonicalIds[index]);
    await railButton.click();
    await setEditMode(page, true);
    await page.getByRole("button", { name: "Edit product", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "Edit product", exact: true });
    await expect(edit.getByLabel("Profit rate", { exact: true })).toHaveValue("17.25");
    await edit.getByRole("button", { name: "Choose icon", exact: true }).click();
    await expect(edit.getByRole("radio", { name: index === 0 ? "Google / Workspace" : "Microsoft / Windows", exact: true })).toBeChecked();
    const renamed = `${product.name} Updated`;
    await edit.getByLabel("Product name", { exact: true }).fill(renamed);
    await edit.getByRole("button", { name: "Save changes", exact: true }).click();
    expectedProducts[index].name = renamed;
    for (const license of product.licenses) {
      await page.getByRole("button", { name: `Edit ${license.name}`, exact: true }).click();
      const licenseDialog = page.getByRole("dialog", { name: "Edit license", exact: true });
      await expect(licenseDialog.getByLabel("Profit rate", { exact: true })).toHaveValue("markupPercent" in license ? "0" : "");
      await expect(licenseDialog.getByLabel("Monthly price", { exact: true })).toHaveValue("8.25");
      await expect(licenseDialog.getByLabel("Annual paid monthly price", { exact: true })).toHaveValue("10");
      await expect(licenseDialog.getByLabel("Annual paid yearly price", { exact: true })).toHaveValue("100");
      await licenseDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    }
    await setEditMode(page, false);
    for (const license of product.licenses) {
      await page.getByRole("button", { name: `Add ${license.name} to quote`, exact: true }).press("Enter");
      const line = page.getByRole("group", { name: license.name, exact: true });
      await expect(line.getByLabel("Price", { exact: true })).toHaveValue("10");
      await expect(line.getByLabel("Profit rate", { exact: true })).toHaveValue("markupPercent" in license ? "0" : "17.25");
    }
  }
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$65.26");
  await page.reload();
  for (const product of expectedProducts) {
    await expect(page.getByRole("button", { name: product.name, exact: true }).locator("[data-product-icon]"))
      .toHaveAttribute("data-product-icon", product.icon);
  }
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null") as unknown, catalogKey))
    .toEqual({ version: 2, seedRevision: 1, products: expectedProducts });
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue(quote.customer);
  await expect(page.getByLabel("Sales Proposal", { exact: true })).toHaveValue(quote.reference);
  await expect(page.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue(quote.notes);
  await expect(page.getByTestId("quote-line")).toHaveCount(5);
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$65.26");
  expect(await page.evaluate(() => (JSON.parse(localStorage.getItem("seatline.quote.v1") ?? "null") as { lines: unknown[] }).lines[0]))
    .toEqual(quote.lines[0]);
  await page.screenshot({ path: testInfo.outputPath("migrated-icon-catalog-and-quote.png") });
});
