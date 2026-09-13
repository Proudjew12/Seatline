import type { Locator, Page } from "@playwright/test";

import { closeSettings, expect, openSettings, setEditMode, test } from "./fixtures";

const catalogKey = "seatline.catalog.v2";
const themeGroups = [
  { name: "Default light and dark", themes: ["Default", "Default dark"] },
  { name: "color themes", themes: ["Studio", "Midnight", "Dune", "Forest", "Plum"] },
  { name: "original background themes", themes: ["Aurora", "Solstice", "Orbit", "Harbor", "Meadow", "Alpine"] },
  { name: "Aurora variants", themes: ["Aurora Rose", "Aurora Mint", "Aurora Ice", "Aurora Peach", "Aurora Dusk", "Aurora Ocean"] },
];

async function addProductDialog(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  return page.getByRole("dialog", { name: "Add product", exact: true });
}

async function pickIcon(dialog: Locator, name: string): Promise<string> {
  const toggle = dialog.getByRole("button", { name: "Choose icon", exact: true });
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  await dialog.getByRole("searchbox", { name: "Search icons", exact: true }).fill(name);
  const choice = dialog.getByRole("radio", { name, exact: true });
  await choice.locator("xpath=ancestor::label[1]").click();
  await expect(choice).toBeChecked();
  return toggle.locator("[data-product-icon]").evaluate((element) => getComputedStyle(element).maskImage);
}

async function expectDialogContained(dialog: Locator, width: number): Promise<void> {
  const geometry = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, contained: element.scrollWidth <= element.clientWidth };
  });
  expect(geometry.contained).toBe(true);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(width);
}

async function expectLocalIconsLoaded(icons: Locator): Promise<void> {
  const results = await icons.evaluateAll(async (elements) => Promise.all(elements.map(async (element) => {
    const mask = getComputedStyle(element).maskImage;
    const path = /^url\(["']?(.*?)["']?\)$/.exec(mask)?.[1];
    if (!path) return { local: false, loaded: false };
    const url = new URL(path, location.href);
    const image = new Image();
    image.src = url.href;
    await image.decode();
    return { local: url.origin === location.origin, loaded: image.naturalWidth > 0 && image.naturalHeight > 0 };
  })));
  expect(results.length).toBeGreaterThan(0);
  for (const result of results) expect(result).toEqual({ local: true, loaded: true });
}

async function iconContrast(icon: Locator): Promise<number> {
  return icon.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Color measurement is unavailable");
    const luminance = (channels: Uint8ClampedArray) => {
      const linear = Array.from(channels.slice(0, 3), (value) => {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    context.fillStyle = getComputedStyle(element).color;
    context.fillRect(0, 0, 1, 1);
    const foreground = luminance(context.getImageData(0, 0, 1, 1).data);
    const layers: string[] = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      // Bound any artwork beneath translucent surfaces with black and white.
      if (style.backgroundImage !== "none") break;
      layers.unshift(style.backgroundColor);
    }
    return Math.min(...["#000", "#fff"].map((base) => {
      context.fillStyle = base;
      context.fillRect(0, 0, 1, 1);
      for (const layer of layers) {
        context.fillStyle = layer;
        context.fillRect(0, 0, 1, 1);
      }
      const background = luminance(context.getImageData(0, 0, 1, 1).data);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    }));
  });
}

test("creates an empty product with only its name, short label and icon, then edits its saved icon", async ({ page }, testInfo) => {
  await page.goto("/");
  await setEditMode(page, true);
  const dialog = await addProductDialog(page);
  await expect(dialog.getByRole("textbox")).toHaveCount(2);
  await expect(dialog.getByRole("group", { name: "Product icon", exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Profit rate", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("group", { name: "Default prices · USD", exact: true })).toHaveCount(0);
  await dialog.getByLabel("Product name", { exact: true }).fill("Adobe Acrobat");
  await expect(dialog.getByRole("button", { name: "Choose icon", exact: true }).locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "adobe-acrobat");
  await dialog.getByLabel("Product name", { exact: true }).fill("Zoomed Support");
  await expect(dialog.getByRole("button", { name: "Choose icon", exact: true }).locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "generic");
  await dialog.getByLabel("Product name", { exact: true }).fill("Northwind Tools");
  await dialog.getByLabel("Short label", { exact: true }).fill("NW");
  const previewMask = await pickIcon(dialog, "Figma");
  await expectLocalIconsLoaded(dialog.locator("[data-product-icon]"));
  await page.screenshot({ path: testInfo.outputPath("add-product-icon-picker.png") });
  await dialog.getByRole("button", { name: "Add product", exact: true }).click();
  const product = page.getByRole("navigation", { name: "Products", exact: true }).getByRole("button", { name: "Northwind Tools", exact: true });
  await expect(product).toHaveAttribute("aria-pressed", "true");
  await expect(product).toHaveText("NW");
  await expect(product.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "figma");
  await expect(product.locator("[data-product-icon]")).toHaveCSS("mask-image", previewMask);
  await expect(page.getByText("No licenses yet", { exact: true })).toBeVisible();
  await page.reload();
  await product.click();
  await expect(product.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "figma");
  await expect(page.getByText("No licenses yet", { exact: true })).toBeVisible();
  await setEditMode(page, true);
  await page.getByRole("button", { name: "Edit product", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit product", exact: true });
  await expect(edit.getByLabel("Profit rate", { exact: true })).toHaveValue("0");
  await pickIcon(edit, "GitHub");
  await edit.getByLabel("Product name", { exact: true }).fill("Northwind Apps");
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Add license", exact: true }).click();
  const license = page.getByRole("dialog", { name: "Add license", exact: true });
  await expect(license.getByLabel("Profit rate", { exact: true })).toHaveValue("");
  await expect(license.getByText("0%", { exact: true })).toBeVisible();
  await license.getByLabel("License name", { exact: true }).fill("Design seat");
  await license.getByLabel("Annual paid monthly price", { exact: true }).fill("25");
  await license.getByRole("button", { name: "Add license", exact: true }).click();
  await page.getByRole("button", { name: "Add Design seat to quote", exact: true }).press("Enter");
  await expect(page.getByTestId("quote-line").getByLabel("Profit rate", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$25.00");
  await page.reload();
  const renamed = page.getByRole("button", { name: "Northwind Apps", exact: true });
  await expect(renamed.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "github");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$25.00");
});

test("keeps cancelled icon changes and invalid product names or labels out of the catalog", async ({ page }) => {
  await page.goto("/");
  await setEditMode(page, true);
  let dialog = await addProductDialog(page);
  await expect(dialog.getByRole("button", { name: "Choose icon", exact: true }).locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "generic");
  await dialog.getByLabel("Product name", { exact: true }).fill("Discarded Tools");
  await pickIcon(dialog, "Figma");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Discarded Tools", exact: true })).toHaveCount(0);
  dialog = await addProductDialog(page);
  await dialog.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(dialog.getByLabel("Product name", { exact: true })).toBeFocused();
  expect(await dialog.getByLabel("Product name", { exact: true }).evaluate((element) => element instanceof HTMLInputElement && element.validity.valueMissing)).toBe(true);
  await dialog.getByLabel("Product name", { exact: true }).fill(" microsoft 365 ");
  await dialog.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("A product with this name already exists.");
  await dialog.getByLabel("Product name", { exact: true }).fill("   ");
  await dialog.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Enter a product name up to 80 characters.");
  await dialog.getByLabel("Product name", { exact: true }).fill("Storage Tools");
  await dialog.getByLabel("Short label", { exact: true }).fill("\u007f");
  await dialog.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Enter a short label from 1 to 4 characters.");
  await dialog.getByLabel("Short label", { exact: true }).clear();
  await dialog.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(page.getByRole("button", { name: "Storage Tools", exact: true })).toHaveText("ST");
  await page.getByRole("button", { name: "Edit product", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit product", exact: true });
  const savedIcon = await edit.getByRole("button", { name: "Choose icon", exact: true }).locator("[data-product-icon]").getAttribute("data-product-icon");
  await pickIcon(edit, "Figma");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("button", { name: "Storage Tools", exact: true }).locator("[data-product-icon]")).toHaveAttribute("data-product-icon", savedIcon ?? "generic");
});

test("infers starter brand icons for older catalogs and preserves unrecognized products", async ({ page }) => {
  const products = [
    { id: "microsoft-365", name: "Renamed Productivity", shortName: "M365", icon: "microsoft-365" },
    { id: "google-workspace", name: "Google Workspace", shortName: "GW", icon: "google" },
    { id: "adobe-acrobat", name: "Adobe Acrobat", shortName: "Ac", icon: "adobe-acrobat" },
    { id: "zoom-workplace", name: "Zoom Workplace", shortName: "Zm", icon: "zoom" },
    { id: "acronis", name: "Acronis", shortName: "Acr", icon: "acronis" },
    { id: "custom-legacy", name: "Unrecognized Tools", shortName: "UT", icon: "generic" },
    { id: "custom-figma", name: "Figma", shortName: "Fg", icon: "figma" },
    { id: "custom-unknown", name: "Archived Tools", shortName: "AT", icon: "generic", storedIcon: "retired-symbol" },
  ];
  await page.addInitScript(({ key, products }) => {
    if (sessionStorage.getItem("seeded-icons")) return;
    sessionStorage.setItem("seeded-icons", "yes");
    localStorage.setItem(key, JSON.stringify({ version: 2, seedRevision: 1, products: products.map(({ id, name, shortName, storedIcon }) => ({
      id, name, shortName, markupPercent: "17", licenses: [], ...(storedIcon ? { icon: storedIcon } : {}),
    })) }));
  }, { key: catalogKey, products });
  await page.goto("/");
  for (const product of products) {
    const button = page.getByRole("button", { name: product.name, exact: true });
    await expect(button.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", product.icon);
    await expect(button).toHaveText(product.shortName);
  }
  await expectLocalIconsLoaded(page.getByRole("navigation", { name: "Products", exact: true }).locator("[data-product-icon]"));
  await page.reload();
  await page.getByRole("button", { name: "Unrecognized Tools", exact: true }).click();
  await setEditMode(page, true);
  await page.getByRole("button", { name: "Edit product", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit product", exact: true }).getByLabel("Profit rate", { exact: true })).toHaveValue("17");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("searches and chooses icons by keyboard in Hebrew at 320px and 150%", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => localStorage.setItem("seatline.display.v1", JSON.stringify({
    textSize: 150, locale: "he", themeId: "aurora-ocean", theme: "light",
  })));
  await page.goto("/");
  await openSettings(page);
  await page.getByRole("switch", { name: "מצב עריכה", exact: true }).check();
  await closeSettings(page);
  const trigger = page.getByRole("button", { name: "הוספת מוצר", exact: true });
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "הוספת מוצר", exact: true });
  await dialog.getByLabel("שם המוצר", { exact: true }).fill("כלי עיצוב");
  await dialog.getByLabel("תווית קצרה", { exact: true }).fill("כלים");
  await dialog.getByRole("button", { name: "בחירת סמל", exact: true }).press("Enter");
  const search = dialog.getByRole("searchbox", { name: "חיפוש סמלים", exact: true });
  await search.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("product-icons-hebrew-library.png") });
  await search.fill("no-such-brand-xyz");
  await search.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio")).toHaveCount(0);
  await expect(dialog.getByRole("status")).toBeVisible();
  await search.fill("אקרוניס");
  await expect(dialog.getByRole("radio", { name: "Acronis", exact: true })).toBeVisible();
  await search.fill("Figma");
  const choice = dialog.getByRole("radio", { name: "Figma", exact: true });
  await search.press("Tab");
  await expect(choice).toBeFocused();
  await choice.press("Space");
  await expect(choice).toBeChecked();
  await expectDialogContained(dialog, 320);
  await page.screenshot({ path: testInfo.outputPath("product-icons-hebrew-320-150.png") });
  await search.clear();
  await choice.focus();
  await choice.press("ArrowRight");
  await expect(choice).not.toBeChecked();
  await choice.press("Space");
  await expect(choice).toBeChecked();
  const create = dialog.getByRole("button", { name: "הוספת מוצר", exact: true });
  await create.press("Enter");
  await expect(trigger).toBeFocused();
  const product = page.getByRole("button", { name: "כלי עיצוב", exact: true });
  await expect(product.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "figma");
  await page.reload();
  await expect(product.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "figma");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "aurora-ocean");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("banner").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("product-icons-hebrew-rail.png") });
});

// Bound each workflow so all palettes retain the normal timeout on slower CI workers.
for (const group of themeGroups) {
  test(`loads the bundled icon library and keeps rail symbols visible in ${group.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page).toHaveTitle("Seatline");
    const banner = page.getByRole("banner");
    await expect(banner.getByText("Seatline", { exact: true })).toBeVisible();
    await expect(banner.getByText("S", { exact: true })).toHaveCount(0);
    await page.getByLabel("Customer", { exact: true }).fill("Icon theme customer");
    await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
    await page.getByTestId("quote-line").getByRole("textbox", { name: "Price", exact: true }).fill("22");
    await setEditMode(page, true);
    const dialog = await addProductDialog(page);
    await dialog.getByRole("button", { name: "Choose icon", exact: true }).click();
    await expect(dialog.getByRole("radio")).toHaveCount(62);
    const icons = dialog.getByRole("group", { name: "Available icons", exact: true }).locator("[data-product-icon]");
    await expect(icons).toHaveCount(62);
    await expectLocalIconsLoaded(icons);
    await page.screenshot({ path: testInfo.outputPath("product-icon-library.png") });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    const rail = page.getByRole("navigation", { name: "Products", exact: true });
    for (const name of group.themes) {
      await openSettings(page);
      await page.getByRole("button", { name: "Browse themes", exact: true }).click();
      const gallery = page.getByRole("dialog", { name: "Choose your theme", exact: true });
      await gallery.getByRole("button", { name: name === "Default dark" ? "Default" : name, exact: true }).click();
      await gallery.getByRole("button", { name: "Done", exact: true }).click();
      if (name === "Default dark") await page.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");
      await closeSettings(page);
      await page.mouse.move(0, 0);
      for (const icon of await rail.locator("[data-product-icon]").all()) {
        await expect(icon).toBeVisible();
        expect(await iconContrast(icon), `${name}: each product symbol must contrast with its surface`).toBeGreaterThanOrEqual(3);
      }
      await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("Icon theme customer");
      await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$22.00");
      await expect(banner.getByText("Seatline", { exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`product-icons-${name.toLowerCase().replaceAll(" ", "-")}.png`) });
      if (name === "Aurora Ocean") {
        const creation = await addProductDialog(page);
        await page.screenshot({ path: testInfo.outputPath("add-product-ocean-collapsed.png") });
        await creation.getByRole("button", { name: "Choose icon", exact: true }).click();
        await page.screenshot({ path: testInfo.outputPath("add-product-ocean-library.png") });
        await creation.getByRole("button", { name: "Cancel", exact: true }).click();
      }
    }
  });
}
